import { Test } from '@nestjs/testing';
import { ControleSandrePollProcessorService } from './controle-sandre-poll.processor.service';
import { SandreService } from '@dossier/controle/technique/sandre/sandre.service';
import { DepotService } from '@dossier/depot/depot.service';
import { ReponseSandreGateway } from '@dossier/controle/technique/sandre/reponseSandre.gateway';
import { QueueGateway, QueueName, RapportDestinataire } from '@queue/queue';
import {
  ControleSandreStatus,
  ControleStatus,
  DepotStatus,
  DepotStep,
  EtapeMetier,
  SandreAcceptationStatus,
} from '@lib/dossier';
import { DepotError } from '@dossier/depot/depotError';
import { loggerProviderMock } from '@shared/logger/logger.mock';

describe('ControleSandrePollProcessorService', () => {
  let service: ControleSandrePollProcessorService;
  const sandre = { getValidationResult: jest.fn() };
  const depots = { findById: jest.fn(), transition: jest.fn() };
  const reponses = { createReponseSandre: jest.fn() };
  const queue = { send: jest.fn() };
  const job = { depotId: 'dep_1', jeton: 'token', attemptCount: 0 };
  const pendingDepot = {
    status: DepotStatus.EN_COURS_DE_TRAITEMENT,
    step: DepotStep.PARSER_SANDRE_IN_PROGRESS,
    controleStatus: ControleStatus.SUCCESS,
    controleSandreStatus: ControleSandreStatus.PENDING,
    path: 'test.xml',
  };

  const validationResult = (acceptation: SandreAcceptationStatus) => ({
    ACQ: {
      AccuseReception: {
        Acceptation: String(acceptation),
        Jeton: 'token',
        CodeScenario: 'FCT_ASSAIN',
        VersionScenario: '4',
      },
    },
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    depots.findById.mockResolvedValue(pendingDepot);
    depots.transition.mockResolvedValue(true);
    sandre.getValidationResult.mockResolvedValue(validationResult(SandreAcceptationStatus.CONFORMANT));
    const module = await Test.createTestingModule({
      providers: [
        ControleSandrePollProcessorService,
        { provide: SandreService, useValue: sandre },
        { provide: DepotService, useValue: depots },
        { provide: ReponseSandreGateway, useValue: reponses },
        { provide: QueueGateway, useValue: queue },
        loggerProviderMock,
      ],
    }).compile();
    service = module.get(ControleSandrePollProcessorService);
  });

  it('persists a conformant result and transitions atomically to SFTP', async () => {
    await service.process(job);
    expect(reponses.createReponseSandre).toHaveBeenCalledWith(
      expect.objectContaining({ depotId: 'dep_1', isConformant: true }),
    );
    expect(depots.transition).toHaveBeenCalledWith(
      'dep_1',
      [DepotStep.PARSER_SANDRE_IN_PROGRESS],
      {
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.READY_FOR_SFTP,
        controleSandreStatus: ControleSandreStatus.SUCCESS,
        etapeMetier: EtapeMetier.FINALISATION_IMPORT,
      },
      { name: QueueName.send_to_sftp, data: { depotId: 'dep_1', filePath: 'test.xml' } },
    );
    expect(reponses.createReponseSandre.mock.invocationCallOrder[0]).toBeLessThan(
      depots.transition.mock.invocationCallOrder[0],
    );
    expect(queue.send).not.toHaveBeenCalled();
  });

  it('rejects non-conformity and reports only to the deposant', async () => {
    sandre.getValidationResult.mockResolvedValue(validationResult(SandreAcceptationStatus.NON_CONFORMANT));
    await service.process(job);
    expect(depots.transition).toHaveBeenCalledWith(
      'dep_1',
      [DepotStep.PARSER_SANDRE_IN_PROGRESS],
      {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_SANDRE_FAILED,
        controleSandreStatus: ControleSandreStatus.FAILED,
        etapeMetier: EtapeMetier.CONTROLE_METIER,
      },
      { name: QueueName.diffusion_rapport, data: { depotId: 'dep_1', destinataires: [RapportDestinataire.DEPOSANT] } },
    );
    expect(queue.send).not.toHaveBeenCalled();
  });

  it.each([SandreAcceptationStatus.WAITING, SandreAcceptationStatus.PROCESSING])(
    'keeps polling while acceptance is %s',
    async (acceptation) => {
      sandre.getValidationResult.mockResolvedValue(validationResult(acceptation));
      await service.process(job);
      expect(queue.send).toHaveBeenCalledWith(
        QueueName.controle_sandre_poll,
        { ...job, attemptCount: 1 },
        { startAfter: 30 },
      );
      expect(reponses.createReponseSandre).not.toHaveBeenCalled();
      expect(depots.transition).not.toHaveBeenCalled();
    },
  );

  it('rejects a polling timeout without a report', async () => {
    sandre.getValidationResult.mockResolvedValue(validationResult(SandreAcceptationStatus.WAITING));
    await service.process({ ...job, attemptCount: 240 });
    expect(depots.transition).toHaveBeenCalledWith('dep_1', [DepotStep.PARSER_SANDRE_IN_PROGRESS], {
      status: DepotStatus.REJETE,
      step: DepotStep.CONTROLE_SANDRE_FAILED,
      controleSandreStatus: ControleSandreStatus.FAILED,
      error: DepotError.SANDRE_POLL_TIMEOUT,
    });
    expect(queue.send).not.toHaveBeenCalled();
  });

  it('retries transient technical errors with the same delay', async () => {
    sandre.getValidationResult.mockRejectedValue(new Error('SANDRE unavailable'));
    await service.process(job);
    expect(queue.send).toHaveBeenCalledWith(
      QueueName.controle_sandre_poll,
      { ...job, attemptCount: 1 },
      { startAfter: 30 },
    );
    expect(depots.transition).not.toHaveBeenCalled();
  });

  it('rejects a definitive technical error without a report', async () => {
    sandre.getValidationResult.mockRejectedValue(new Error('SANDRE unavailable'));
    await service.process({ ...job, attemptCount: 240 });
    expect(depots.transition).toHaveBeenCalledWith('dep_1', [DepotStep.PARSER_SANDRE_IN_PROGRESS], {
      status: DepotStatus.REJETE,
      step: DepotStep.CONTROLE_SANDRE_FAILED,
      controleSandreStatus: ControleSandreStatus.FAILED,
      error: DepotError.SANDRE_POLL_FAILED,
    });
    expect(queue.send).not.toHaveBeenCalled();
  });

  it.each([
    { status: DepotStatus.REJETE },
    { status: DepotStatus.INTEGRE },
    { status: DepotStatus.INTEGRE_PARTIELLEMENT },
    { step: DepotStep.READY_FOR_SFTP },
    { step: DepotStep.SFTP_IN_PROGRESS },
    { step: DepotStep.SFTP_COMPLETED },
    { controleStatus: ControleStatus.FAILED },
    { controleStatus: ControleStatus.PENDING },
    { controleSandreStatus: ControleSandreStatus.SUCCESS },
    { controleSandreStatus: ControleSandreStatus.FAILED },
  ])('ignores late/replayed poll jobs: %j', async (state) => {
    depots.findById.mockResolvedValue({ ...pendingDepot, ...state });
    await service.process(job);
    expect(sandre.getValidationResult).not.toHaveBeenCalled();
    expect(reponses.createReponseSandre).not.toHaveBeenCalled();
    expect(depots.transition).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });

  it('propagates follow-up enqueue errors rather than rejecting a conformant depot', async () => {
    depots.transition.mockRejectedValue(new Error('Enqueue failed'));
    await expect(service.process(job)).rejects.toThrow('Enqueue failed');
    expect(depots.transition).toHaveBeenCalledTimes(1);
    expect(queue.send).not.toHaveBeenCalled();
  });
});
