import { Test } from '@nestjs/testing';
import { ControleSandrePollProcessorService } from './controle-sandre-poll.processor.service';
import { SandreService } from '@dossier/controle/technique/sandre/sandre.service';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotWorkflowService } from '@dossier/depot/depotWorkflow.service';
import { ReponseSandreGateway } from '@dossier/controle/technique/sandre/reponseSandre.gateway';
import { QueueGateway, QueueName } from '@queue/queue';
import { ControleSandreStatus, ControleStatus, DepotStatus, DepotStep, SandreAcceptationStatus } from '@lib/dossier';
import { DepotError } from '@dossier/depot/depotError';
import { loggerProviderMock } from '@shared/logger/logger.mock';

describe('ControleSandrePollProcessorService', () => {
  let service: ControleSandrePollProcessorService;
  const sandre = { getValidationResult: jest.fn() };
  const depots = { findById: jest.fn() };
  const workflow = { completeSandreValidation: jest.fn(), failSandreValidation: jest.fn() };
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
    workflow.completeSandreValidation.mockResolvedValue(true);
    workflow.failSandreValidation.mockResolvedValue(true);
    sandre.getValidationResult.mockResolvedValue(validationResult(SandreAcceptationStatus.CONFORMANT));
    const module = await Test.createTestingModule({
      providers: [
        ControleSandrePollProcessorService,
        { provide: SandreService, useValue: sandre },
        { provide: DepotService, useValue: depots },
        { provide: DepotWorkflowService, useValue: workflow },
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
    expect(workflow.completeSandreValidation).toHaveBeenCalledWith('dep_1', true);
    expect(reponses.createReponseSandre.mock.invocationCallOrder[0]).toBeLessThan(
      workflow.completeSandreValidation.mock.invocationCallOrder[0],
    );
    expect(queue.send).not.toHaveBeenCalled();
  });

  it('rejects non-conformity and reports only to the deposant', async () => {
    sandre.getValidationResult.mockResolvedValue(validationResult(SandreAcceptationStatus.NON_CONFORMANT));
    await service.process(job);
    expect(workflow.completeSandreValidation).toHaveBeenCalledWith('dep_1', false);
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
      expect(workflow.completeSandreValidation).not.toHaveBeenCalled();
      expect(workflow.failSandreValidation).not.toHaveBeenCalled();
    },
  );

  it('rejects a polling timeout without a report', async () => {
    sandre.getValidationResult.mockResolvedValue(validationResult(SandreAcceptationStatus.WAITING));
    await service.process({ ...job, attemptCount: 240 });
    expect(workflow.failSandreValidation).toHaveBeenCalledWith('dep_1', DepotError.SANDRE_POLL_TIMEOUT);
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
    expect(workflow.completeSandreValidation).not.toHaveBeenCalled();
    expect(workflow.failSandreValidation).not.toHaveBeenCalled();
  });

  it('rejects a definitive technical error without a report', async () => {
    sandre.getValidationResult.mockRejectedValue(new Error('SANDRE unavailable'));
    await service.process({ ...job, attemptCount: 240 });
    expect(workflow.failSandreValidation).toHaveBeenCalledWith('dep_1', DepotError.SANDRE_POLL_FAILED);
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
    expect(workflow.completeSandreValidation).not.toHaveBeenCalled();
    expect(workflow.failSandreValidation).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });

  it('propagates follow-up enqueue errors rather than rejecting a conformant depot', async () => {
    workflow.completeSandreValidation.mockRejectedValue(new Error('Enqueue failed'));
    await expect(service.process(job)).rejects.toThrow('Enqueue failed');
    expect(workflow.completeSandreValidation).toHaveBeenCalledTimes(1);
    expect(workflow.failSandreValidation).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });
});
