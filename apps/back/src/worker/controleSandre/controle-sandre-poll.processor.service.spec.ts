/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ControleSandrePollProcessorService } from './controle-sandre-poll.processor.service';
import { SandreService } from '@dossier/controle/technique/sandre/sandre.service';
import { DepotService } from '@dossier/depot/depot.service';
import { ReponseSandreGateway } from '@dossier/controle/technique/sandre/reponseSandre.gateway';
import { QueueGateway, QueueName, RapportDestinataire } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { SharedModule } from '@shared/shared.module';
import { loggerProviderMock } from '@shared/logger/logger.mock';
import { ControleSandreStatus, DepotStep, DepotStatus, EtapeMetier } from '@lib/dossier';
import { DepotError } from '@dossier/depot/depotError';

describe('ControleSandrePollProcessorService - final decision point', () => {
  let service: ControleSandrePollProcessorService;
  let mockSandreService: SandreService;
  let mockDepotService: DepotService;
  let mockReponseSandreGateway: ReponseSandreGateway;
  let mockQueueService: Queue;

  const depotId = 'dep_poll_001';
  const jeton = 'mock-jeton';

  const aValidationResult = (acceptation: number) => ({
    ACQ: {
      AccuseReception: {
        Acceptation: String(acceptation),
        Jeton: jeton,
        CodeScenario: 'FCT_ASSAIN',
        VersionScenario: '4',
      },
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSandreService = {
      getValidationResult: jest.fn(),
    } as unknown as SandreService;

    mockDepotService = {
      findById: jest.fn().mockResolvedValue({
        id: depotId,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.PARSER_SANDRE_IN_PROGRESS,
        path: 'depots/dep_poll_001/file.xml',
      }),
      update: jest.fn().mockResolvedValue({}),
    } as unknown as DepotService;

    mockReponseSandreGateway = {
      createReponseSandre: jest.fn().mockResolvedValue({}),
    } as unknown as ReponseSandreGateway;

    mockQueueService = {
      send: jest.fn().mockResolvedValue('job-id'),
      work: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [
        ControleSandrePollProcessorService,
        { provide: SandreService, useValue: mockSandreService },
        { provide: DepotService, useValue: mockDepotService },
        { provide: ReponseSandreGateway, useValue: mockReponseSandreGateway },
        { provide: QueueGateway, useValue: mockQueueService },
        loggerProviderMock,
      ],
    }).compile();

    service = module.get<ControleSandrePollProcessorService>(ControleSandrePollProcessorService);
  });

  it('dispatches the SFTP job when the SANDRE result is conformant', async () => {
    (mockSandreService.getValidationResult as jest.Mock).mockResolvedValue(aValidationResult(1));

    await service.process({ depotId, jeton, attemptCount: 0 });

    expect(mockReponseSandreGateway.createReponseSandre).toHaveBeenCalledWith(
      expect.objectContaining({ depotId, jeton, isConformant: true }),
    );

    expect(mockDepotService.update).toHaveBeenNthCalledWith(1, depotId, {
      controleSandreStatus: ControleSandreStatus.SUCCESS,
      step: DepotStep.CONTROLE_SANDRE_COMPLETED,
      etapeMetier: EtapeMetier.SCENARIO_SANDRE,
    });
    expect(mockDepotService.update).toHaveBeenNthCalledWith(2, depotId, {
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.READY_FOR_SFTP,
      etapeMetier: EtapeMetier.FINALISATION_IMPORT,
    });

    expect(mockQueueService.send).toHaveBeenCalledTimes(1);
    expect(mockQueueService.send).toHaveBeenCalledWith(QueueName.send_to_sftp, {
      depotId,
      filePath: 'depots/dep_poll_001/file.xml',
    });
  });

  it('rejects the depot and notifies the deposant when the SANDRE result is non-conformant', async () => {
    (mockSandreService.getValidationResult as jest.Mock).mockResolvedValue(aValidationResult(2));

    await service.process({ depotId, jeton, attemptCount: 0 });

    expect(mockReponseSandreGateway.createReponseSandre).toHaveBeenCalledWith(
      expect.objectContaining({ depotId, jeton, isConformant: false }),
    );

    expect(mockDepotService.update).toHaveBeenCalledWith(depotId, {
      status: DepotStatus.REJETE,
      controleSandreStatus: ControleSandreStatus.FAILED,
      step: DepotStep.CONTROLE_SANDRE_FAILED,
      etapeMetier: EtapeMetier.CONTROLE_METIER,
    });

    expect(mockQueueService.send).toHaveBeenCalledTimes(1);
    expect(mockQueueService.send).toHaveBeenCalledWith(QueueName.diffusion_rapport, {
      depotId,
      destinataires: [RapportDestinataire.DEPOSANT],
    });
    expect(mockQueueService.send).not.toHaveBeenCalledWith(QueueName.send_to_sftp, expect.anything());
  });

  it('re-enqueues the poll job while the SANDRE result is still pending', async () => {
    (mockSandreService.getValidationResult as jest.Mock).mockResolvedValue(aValidationResult(3));

    await service.process({ depotId, jeton, attemptCount: 3 });

    expect(mockDepotService.update).not.toHaveBeenCalled();
    expect(mockQueueService.send).toHaveBeenCalledWith(
      QueueName.controle_sandre_poll,
      { depotId, jeton, attemptCount: 4 },
      { startAfter: expect.any(Number) as number },
    );
  });

  it('rejects the depot without rapport when polling times out', async () => {
    (mockSandreService.getValidationResult as jest.Mock).mockResolvedValue(aValidationResult(3));

    await service.process({ depotId, jeton, attemptCount: 240 });

    expect(mockDepotService.update).toHaveBeenCalledWith(depotId, {
      status: DepotStatus.REJETE,
      step: DepotStep.CONTROLE_SANDRE_FAILED,
      controleSandreStatus: ControleSandreStatus.FAILED,
      error: DepotError.SANDRE_POLL_TIMEOUT,
    });
    // Technical error: no rapport, no SFTP dispatch
    expect(mockQueueService.send).not.toHaveBeenCalled();
  });
});
