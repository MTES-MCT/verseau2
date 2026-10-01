import { Test } from '@nestjs/testing';
import { DepotService } from '@dossier/depot/depot.service';
import { DroitsDepotService } from '@dossier/depot/droitsDepot.service';
import { DepotStatus, DepotStep } from '@lib/dossier';
import { S3 } from '@infra/s3/s3';
import { QueueGateway } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { UserService } from '@user/user.service';
import { FileProcessorService } from './fileProcessor.service';

describe('FileProcessorService logging', () => {
  it('logs the failed deposit processing at log level and preserves the technical error for the worker', async () => {
    const queue = { send: jest.fn() };
    const depotService = { update: jest.fn().mockResolvedValue(undefined) };
    const s3 = { download: jest.fn() };
    const logger = { setContext: jest.fn(), log: jest.fn(), debug: jest.fn(), error: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        FileProcessorService,
        { provide: QueueGateway, useValue: queue },
        { provide: DepotService, useValue: depotService },
        { provide: DroitsDepotService, useValue: { validateDroits: jest.fn() } },
        { provide: UserService, useValue: { findById: jest.fn() } },
        { provide: S3, useValue: s3 },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();
    const service = module.get(FileProcessorService);
    const error = new Error('Storage unavailable');
    s3.download.mockRejectedValue(error);

    await expect(
      service.process({
        depotId: 'dep_1',
        filePath: 'depots/dep_1/file.xml',
        utilisateur: { id: 'user_1', nom: 'Doe', prenom: 'John' },
      }),
    ).rejects.toBe(error);

    expect(logger.log).toHaveBeenCalledWith('Depot dep_1 - Unexpected error during processing', error);
    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(depotService.update).toHaveBeenLastCalledWith('dep_1', {
      status: DepotStatus.REJETE,
      step: DepotStep.CONTROLE_FAILED,
    });
    expect(queue.send).not.toHaveBeenCalled();
  });
});
