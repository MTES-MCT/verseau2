import { Test, TestingModule } from '@nestjs/testing';
import { DepotCoordinatorService } from './depotCoordinator.service';
import { DepotService } from './depot.service';
import { QueueName, QueueGateway, RapportDestinataire } from '@queue/queue';
import { DepotStep, DepotStatus, EtapeMetier, ControleStatus, ControleSandreStatus, DepotDto } from '@lib/dossier';
import { DepotModel } from './depot.model';

jest.mock('pg-boss', () => ({}));
jest.mock('@queue/queue.service', () => ({
  QueueService: jest.fn(),
}));

jest.mock('@shared/logger/logger.service', () => ({
  LoggerService: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('DepotCoordinatorService', () => {
  let service: DepotCoordinatorService;
  let depotService: typeof mockDepotService;
  let queueService: typeof mockQueueService;

  const mockDepotService = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockQueueService = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepotCoordinatorService,
        { provide: DepotService, useValue: mockDepotService },
        { provide: QueueGateway, useValue: mockQueueService },
      ],
    }).compile();

    service = module.get<DepotCoordinatorService>(DepotCoordinatorService);
    depotService = module.get<typeof mockDepotService>(DepotService);
    queueService = module.get<typeof mockQueueService>(QueueGateway);

    jest.clearAllMocks();
  });

  describe('checkControlesCompletion', () => {
    const depotId = 'test-depot-id';

    it('should return early if depot is already in INTEGRE status', async () => {
      depotService.findById.mockResolvedValue({ id: depotId, status: DepotStatus.INTEGRE } as DepotDto);

      await service.checkControlesCompletion(depotId);

      expect(depotService.findById).toHaveBeenCalledWith(depotId);
      expect(depotService.update).not.toHaveBeenCalled();
      expect(queueService.send).not.toHaveBeenCalled();
    });

    it('should return early if depot is already in REJETE status', async () => {
      depotService.findById.mockResolvedValue({ id: depotId, status: DepotStatus.REJETE } as DepotDto);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).not.toHaveBeenCalled();
      expect(queueService.send).not.toHaveBeenCalled();
    });

    it('should return early if depot step indicates SFTP is already dispatched', async () => {
      depotService.findById.mockResolvedValue({ id: depotId, step: DepotStep.READY_FOR_SFTP } as DepotModel);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).not.toHaveBeenCalled();
      expect(queueService.send).not.toHaveBeenCalled();
    });

    it('should return early if controls are still pending', async () => {
      depotService.findById.mockResolvedValue({
        id: depotId,
        nomOriginalFichier: 'test.xml',
        step: DepotStep.CONTROLE_IN_PROGRESS,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DepotModel);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).not.toHaveBeenCalled();
      expect(queueService.send).not.toHaveBeenCalled();
    });

    it('should proceed to SFTP if both controls are successful', async () => {
      const depot = {
        id: depotId,
        nomOriginalFichier: 'test.xml',
        step: DepotStep.CONTROLE_COMPLETED,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        controleStatus: ControleStatus.SUCCESS,
        controleSandreStatus: ControleSandreStatus.SUCCESS,
        path: '/path/to/file',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DepotModel;
      depotService.findById.mockResolvedValue(depot);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).toHaveBeenCalledWith(depotId, {
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.READY_FOR_SFTP,
        etapeMetier: EtapeMetier.FINALISATION_IMPORT,
      });
      expect(queueService.send).toHaveBeenCalledWith(QueueName.send_to_sftp, {
        depotId: depot.id,
        filePath: depot.path,
      });
    });

    it('should fail the depot if Controle V1 fails', async () => {
      depotService.findById.mockResolvedValue({
        id: depotId,
        nomOriginalFichier: 'test.xml',
        step: DepotStep.CONTROLE_COMPLETED,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        controleStatus: ControleStatus.FAILED,
        controleSandreStatus: ControleSandreStatus.SUCCESS,
        path: '/path/to/file',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DepotModel);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).toHaveBeenCalledWith(depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_FAILED,
      });
      expect(queueService.send).toHaveBeenCalledWith(QueueName.diffusion_rapport, {
        depotId,
        destinataires: [RapportDestinataire.DEPOSANT],
      });
    });

    it('should fail the depot if Controle Sandre fails', async () => {
      depotService.findById.mockResolvedValue({
        id: depotId,
        nomOriginalFichier: 'test.xml',
        step: DepotStep.CONTROLE_COMPLETED,
        controleStatus: ControleStatus.SUCCESS,
        controleSandreStatus: ControleSandreStatus.FAILED,
        path: '/path/to/file',
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DepotModel);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).toHaveBeenCalledWith(depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_SANDRE_FAILED,
      });
      expect(queueService.send).toHaveBeenCalledWith(QueueName.diffusion_rapport, {
        depotId,
        destinataires: [RapportDestinataire.DEPOSANT],
      });
    });

    it('should prioritize V1 failure over Sandre failure if both fail', async () => {
      depotService.findById.mockResolvedValue({
        id: depotId,
        nomOriginalFichier: 'test.xml',
        step: DepotStep.CONTROLE_COMPLETED,
        controleStatus: ControleStatus.FAILED,
        controleSandreStatus: ControleSandreStatus.SUCCESS,
        path: '/path/to/file',
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DepotModel);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).toHaveBeenCalledWith(depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_FAILED,
      });
    });
  });
});
