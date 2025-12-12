import { Test, TestingModule } from '@nestjs/testing';
import { DepotCoordinatorService } from './depotCoordinator.service';
import { DepotService } from './depot.service';
import { QueueService } from '@queue/queue.service';
import { QueueName } from '@queue/queue';
import { DepotStep, DepotStatus, ControleV1Status, ControleSandreStatus, DepotDto } from '@lib/dossier';
import { LoggerService } from '@shared/logger/logger.service';

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
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    service = module.get<DepotCoordinatorService>(DepotCoordinatorService);
    depotService = module.get<typeof mockDepotService>(DepotService);
    queueService = module.get<typeof mockQueueService>(QueueService);

    jest.clearAllMocks();
  });

  describe('checkControlesCompletion', () => {
    const depotId = 'test-depot-id';

    it('should return early if depot is already in SUCCESS status', async () => {
      depotService.findById.mockResolvedValue({ id: depotId, status: DepotStatus.SUCCESS } as DepotDto);

      await service.checkControlesCompletion(depotId);

      expect(depotService.findById).toHaveBeenCalledWith(depotId);
      expect(depotService.update).not.toHaveBeenCalled();
      expect(queueService.send).not.toHaveBeenCalled();
    });

    it('should return early if depot is already in FAILED status', async () => {
      depotService.findById.mockResolvedValue({ id: depotId, status: DepotStatus.FAILED } as DepotDto);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).not.toHaveBeenCalled();
      expect(queueService.send).not.toHaveBeenCalled();
    });

    it('should return early if depot step indicates SFTP is already dispatched', async () => {
      depotService.findById.mockResolvedValue({ id: depotId, step: DepotStep.READY_FOR_SFTP } as DepotDto);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).not.toHaveBeenCalled();
      expect(queueService.send).not.toHaveBeenCalled();
    });

    it('should return early if controls are still pending', async () => {
      depotService.findById.mockResolvedValue({
        id: depotId,
        controleV1Status: ControleV1Status.PENDING,
        controleSandreStatus: ControleSandreStatus.SUCCESS,
      } as DepotDto);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).not.toHaveBeenCalled();
      expect(queueService.send).not.toHaveBeenCalled();
    });

    it('should proceed to SFTP if both controls are successful', async () => {
      const depot = {
        id: depotId,
        path: '/path/to/file',
        controleV1Status: ControleV1Status.SUCCESS,
        controleSandreStatus: ControleSandreStatus.SUCCESS,
      } as DepotDto;
      depotService.findById.mockResolvedValue(depot);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).toHaveBeenCalledWith(depotId, {
        status: DepotStatus.PROCESSING,
        step: DepotStep.READY_FOR_SFTP,
      });
      expect(queueService.send).toHaveBeenCalledWith(QueueName.send_to_sftp, {
        depotId: depot.id,
        filePath: depot.path,
      });
    });

    it('should fail the depot if Controle V1 fails', async () => {
      depotService.findById.mockResolvedValue({
        id: depotId,
        controleV1Status: ControleV1Status.FAILED,
        controleSandreStatus: ControleSandreStatus.SUCCESS,
      } as DepotDto);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).toHaveBeenCalledWith(depotId, {
        status: DepotStatus.FAILED,
        step: DepotStep.CONTROLE_V1_FAILED,
      });
      expect(queueService.send).not.toHaveBeenCalled();
    });

    it('should fail the depot if Controle Sandre fails', async () => {
      depotService.findById.mockResolvedValue({
        id: depotId,
        controleV1Status: ControleV1Status.SUCCESS,
        controleSandreStatus: ControleSandreStatus.FAILED,
      } as DepotDto);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).toHaveBeenCalledWith(depotId, {
        status: DepotStatus.FAILED,
        step: DepotStep.CONTROLE_SANDRE_FAILED,
      });
      expect(queueService.send).not.toHaveBeenCalled();
    });

    it('should prioritize V1 failure over Sandre failure if both fail', async () => {
      depotService.findById.mockResolvedValue({
        id: depotId,
        controleV1Status: ControleV1Status.FAILED,
        controleSandreStatus: ControleSandreStatus.FAILED,
      } as DepotDto);

      await service.checkControlesCompletion(depotId);

      expect(depotService.update).toHaveBeenCalledWith(depotId, {
        status: DepotStatus.FAILED,
        step: DepotStep.CONTROLE_V1_FAILED,
      });
    });
  });
});
