import { Test } from '@nestjs/testing';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { DepotModel } from '@dossier/depot/depot.model';
import { DepotUploadGateway, DepotUploadTransaction } from '@dossier/depot/depotUpload.gateway';
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { MasaStatus } from '@dossier/masa/masa.model';
import { DepotStatus, DepotStep } from '@lib/dossier';
import { QueueGateway, QueueName, RapportDestinataire } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { MasaWebhookProcessorService } from './masaWebhookProcessor.service';

describe('MasaWebhookProcessorService — early webhook', () => {
  let service: MasaWebhookProcessorService;
  let depot: DepotModel;
  let send: jest.Mock<
    Promise<string | null>,
    [QueueName, typeof data & { sftpDeferralCount: number }, { startAfter: number }]
  >;
  let transaction: jest.Mock;
  let save: jest.Mock;
  let sendInTransaction: jest.Mock;
  const data = { masaId: 'masa_early', depotId: 'depot_early', correlationId: 'correlation_early' };

  beforeEach(async () => {
    depot = {
      id: data.depotId,
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.SFTP_IN_PROGRESS,
    } as DepotModel;
    send = jest.fn<ReturnType<typeof send>, Parameters<typeof send>>().mockResolvedValue('deferred_job');
    save = jest.fn().mockImplementation((updated: DepotModel) => {
      depot = updated;
      return Promise.resolve(updated);
    });
    sendInTransaction = jest.fn().mockResolvedValue('diffusion_job');
    transaction = jest.fn().mockImplementation((operation: (tx: DepotUploadTransaction) => Promise<unknown>) =>
      operation({
        create: jest.fn(),
        findForUpdate: jest.fn().mockImplementation(() => Promise.resolve(depot)),
        save,
        send: sendInTransaction,
      }),
    );
    const module = await Test.createTestingModule({
      providers: [
        MasaWebhookProcessorService,
        {
          provide: MasaGateway,
          useValue: { findById: jest.fn().mockResolvedValue({ id: data.masaId, statut: MasaStatus.INTEGRE }) },
        },
        {
          provide: DepotGateway,
          useValue: { findDepotByIdWithUser: jest.fn().mockImplementation(() => Promise.resolve(depot)) },
        },
        { provide: DepotUploadGateway, useValue: { transaction } },
        { provide: QueueGateway, useValue: { send } },
        {
          provide: LoggerService,
          useValue: { setContext: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(MasaWebhookProcessorService);
  });

  it('defers an early callback, then applies the saved result after SFTP completes', async () => {
    await service.process(data);

    expect(transaction).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(
      QueueName.process_after_masa_webhook,
      { ...data, sftpDeferralCount: 1 },
      { startAfter: 5 },
    );
    const deferredData = send.mock.calls[0][1];
    depot.step = DepotStep.SFTP_COMPLETED;

    await service.process(deferredData);

    expect(depot.status).toBe(DepotStatus.INTEGRE);
    expect(depot.step).toBe(DepotStep.MASA_CALLED_ENPOINT);
    expect(save).toHaveBeenCalledTimes(1);
    expect(sendInTransaction).toHaveBeenCalledWith(QueueName.diffusion_rapport, {
      depotId: data.depotId,
      masaId: data.masaId,
      destinataires: [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU],
    });
    expect(send).toHaveBeenCalledTimes(1);

    await service.process(deferredData);
    expect(save).toHaveBeenCalledTimes(1);
    expect(sendInTransaction).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('bounds delayed deferrals and fails visibly if SFTP never completes', async () => {
    let deferredData = { ...data, sftpDeferralCount: 0 };
    for (let attempt = 1; attempt <= 12; attempt++) {
      await service.process(deferredData);
      expect(send).toHaveBeenLastCalledWith(
        QueueName.process_after_masa_webhook,
        { ...data, sftpDeferralCount: attempt },
        { startAfter: 5 },
      );
      deferredData = send.mock.calls[attempt - 1][1];
    }

    // Even pg-boss redelivery of the exhausted job must not reset the deferral budget.
    await expect(service.process(deferredData)).rejects.toThrow('SFTP completion timeout');
    await expect(service.process(deferredData)).rejects.toThrow('SFTP completion timeout');
    expect(send).toHaveBeenCalledTimes(12);
    expect(transaction).not.toHaveBeenCalled();

    // The budget must not prevent processing when SFTP eventually completed before a retry.
    depot.step = DepotStep.SFTP_COMPLETED;
    await service.process(deferredData);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('propagates a failed deferred enqueue so pg-boss can retry the current job', async () => {
    const error = new Error('queue unavailable');
    send.mockRejectedValueOnce(error);

    await expect(service.process(data)).rejects.toThrow(error);
    expect(transaction).not.toHaveBeenCalled();

    await service.process(data);
    expect(send).toHaveBeenLastCalledWith(
      QueueName.process_after_masa_webhook,
      { ...data, sftpDeferralCount: 1 },
      { startAfter: 5 },
    );
  });

  it('does not silently acknowledge a deferred enqueue returning no job ID', async () => {
    send.mockResolvedValueOnce(null);

    await expect(service.process(data)).rejects.toThrow('Failed to defer MASA return');
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([
    [DepotStatus.INTEGRE, DepotStep.SFTP_IN_PROGRESS],
    [DepotStatus.INTEGRE_PARTIELLEMENT, DepotStep.SFTP_IN_PROGRESS],
    [DepotStatus.REJETE, DepotStep.SFTP_IN_PROGRESS],
    [DepotStatus.REJETE, DepotStep.SFTP_FAILED],
    [DepotStatus.EN_COURS_DE_TRAITEMENT, DepotStep.SFTP_FAILED],
    [DepotStatus.EN_COURS_DE_TRAITEMENT, DepotStep.READY_FOR_SFTP],
    [DepotStatus.EN_COURS_DE_TRAITEMENT, DepotStep.CONTROLE_IN_PROGRESS],
    [DepotStatus.INTEGRE, DepotStep.SFTP_COMPLETED],
  ])('does not defer or transition an unrelated/terminal depot (%s, %s)', async (status, step) => {
    depot.status = status;
    depot.step = step;

    await service.process(data);

    expect(send).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('stops deferring if SFTP failed between the early callback and its deferred job', async () => {
    await service.process(data);
    const deferredData = send.mock.calls[0][1];
    depot.status = DepotStatus.REJETE;
    depot.step = DepotStep.SFTP_FAILED;

    await service.process(deferredData);

    expect(send).toHaveBeenCalledTimes(1);
    expect(transaction).not.toHaveBeenCalled();
    expect(depot.status).toBe(DepotStatus.REJETE);
  });
});
