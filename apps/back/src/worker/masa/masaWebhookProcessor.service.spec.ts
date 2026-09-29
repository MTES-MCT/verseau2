/* eslint-disable @typescript-eslint/unbound-method */
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { MasaStatus } from '@dossier/masa/masa.model';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { DepotModel } from '@dossier/depot/depot.model';
import { DepotStatus, DepotStep } from '@lib/dossier';
import { QueueGateway, QueueName, RapportDestinataire } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MasaWebhookProcessorService } from './masaWebhookProcessor.service';

const awaitingMasaDepot = {
  id: 'depot_1',
  status: DepotStatus.EN_COURS_DE_TRAITEMENT,
  step: DepotStep.SFTP_COMPLETED,
} as unknown as DepotModel;

const integratedDepot = {
  id: 'depot_1',
  status: DepotStatus.INTEGRE,
  step: DepotStep.MASA_CALLED_ENPOINT,
} as unknown as DepotModel;

const rejectedBeforeSftpDepot = {
  id: 'depot_1',
  status: DepotStatus.REJETE,
  step: DepotStep.CONTROLE_FAILED,
} as unknown as DepotModel;

describe('MasaWebhookProcessorService', () => {
  let service: MasaWebhookProcessorService;
  let masaGateway: jest.Mocked<MasaGateway>;
  let depotGateway: jest.Mocked<DepotGateway>;
  let queueService: jest.Mocked<Queue>;
  let logger: { setContext: jest.Mock; log: jest.Mock; error: jest.Mock; warn: jest.Mock };

  beforeEach(async () => {
    masaGateway = {
      findById: jest.fn().mockResolvedValue({
        id: 'masa_1',
        depotId: 'depot_1',
        numeroDepotVerseau1: 'V1-1',
        statut: MasaStatus.INTEGRE,
        statutMasa: null,
        rapport: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findByDepotId: jest.fn(),
      saveMasaRetour: jest.fn(),
    };

    depotGateway = {
      findDepotByIdWithUser: jest.fn().mockResolvedValue(awaitingMasaDepot),
      updateDepot: jest.fn().mockResolvedValue({ id: 'depot_1' }),
    } as unknown as jest.Mocked<DepotGateway>;

    queueService = {
      send: jest.fn().mockResolvedValue('job_1'),
      work: jest.fn(),
    };

    logger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasaWebhookProcessorService,
        { provide: MasaGateway, useValue: masaGateway },
        { provide: DepotGateway, useValue: depotGateway },
        { provide: QueueGateway, useValue: queueService },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get(MasaWebhookProcessorService);
  });

  it('should enqueue rapport diffusion to deposant and agence de eau after accepted MASA processing', async () => {
    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

    expect(depotGateway.updateDepot).toHaveBeenCalledWith('depot_1', {
      status: DepotStatus.INTEGRE,
      step: DepotStep.MASA_CALLED_ENPOINT,
      etapeMetier: null,
    });
    expect(queueService.send).toHaveBeenCalledWith(QueueName.diffusion_rapport, {
      depotId: 'depot_1',
      masaId: 'masa_1',
      destinataires: [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU],
    });
  });

  it('should enqueue rapport diffusion to deposant only when MASA refuses the depot', async () => {
    masaGateway.findById.mockResolvedValue({
      id: 'masa_1',
      depotId: 'depot_1',
      numeroDepotVerseau1: 'V1-1',
      statut: MasaStatus.REFUSE,
      statutMasa: null,
      rapport: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

    expect(depotGateway.updateDepot).toHaveBeenCalledWith('depot_1', {
      status: DepotStatus.REJETE,
      step: DepotStep.MASA_CALLED_ENPOINT,
      etapeMetier: null,
    });
    expect(queueService.send).toHaveBeenCalledWith(QueueName.diffusion_rapport, {
      depotId: 'depot_1',
      masaId: 'masa_1',
      destinataires: [RapportDestinataire.DEPOSANT],
    });
  });

  it('should not transition a depot that is not awaiting a MASA return (already integrated)', async () => {
    depotGateway.findDepotByIdWithUser.mockResolvedValue(integratedDepot);

    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

    expect(depotGateway.updateDepot).not.toHaveBeenCalled();
    expect(queueService.send).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('not awaiting a MASA return'),
      expect.objectContaining({ masaId: 'masa_1', depotId: 'depot_1' }),
    );
  });

  it('should not transition a depot rejected before the SFTP send (unrelated step)', async () => {
    depotGateway.findDepotByIdWithUser.mockResolvedValue(rejectedBeforeSftpDepot);

    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

    expect(depotGateway.updateDepot).not.toHaveBeenCalled();
    expect(queueService.send).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should be idempotent on duplicate deliveries once the depot has transitioned', async () => {
    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

    // The first job transitioned the depot: a duplicate job (e.g. re-enqueued by a
    // webhook retry or a pg-boss redelivery) must be a no-op.
    depotGateway.findDepotByIdWithUser.mockResolvedValue(integratedDepot);
    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

    expect(depotGateway.updateDepot).toHaveBeenCalledTimes(1);
    expect(queueService.send).toHaveBeenCalledTimes(1);
  });
});
