import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { DepotRepository } from '@dossier/depot/depot.repository';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { DepotWorkflowService } from '@dossier/depot/depotWorkflow.service';
import { DepotUnitOfWork } from '@dossier/depot/depotUnitOfWork.gateway';
import { DepotUnitOfWorkService } from '@database/depotUnitOfWork.service';
import { TransactionalQueueService } from '@queue/transactionalQueue.service';
import { QueueGateway } from '@queue/queue';
import { DepotStep, DepotStatus } from '@lib/dossier';
import { UserEntity } from '@user/user.entity';
import { ControleEntity } from '@dossier/controle/controle.entity';
import { MasaEntity } from '@dossier/masa/masa.entity';
import { startPostgresContainer, stopPostgresContainer } from '../../testcontainer.config';

describe('Depot workflow transactions', () => {
  let module: TestingModule;
  let depots: DepotGateway;
  let workflow: DepotWorkflowService;
  let dataSource: DataSource;
  const queue = { send: jest.fn() };

  beforeAll(async () => {
    const container = await startPostgresContainer();
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: container.getConnectionUri(),
          entities: [DepotEntity, UserEntity, ControleEntity, MasaEntity],
          synchronize: true,
        }),
      ],
      providers: [
        { provide: DepotGateway, useClass: DepotRepository },
        { provide: DepotUnitOfWork, useClass: DepotUnitOfWorkService },
        { provide: QueueGateway, useValue: queue },
        TransactionalQueueService,
        DepotWorkflowService,
      ],
    }).compile();
    depots = module.get(DepotGateway);
    workflow = module.get(DepotWorkflowService);
    dataSource = module.get(DataSource);
  });

  beforeEach(() => {
    queue.send.mockReset().mockResolvedValue('job_1');
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE TABLE depot CASCADE');
  });

  afterAll(async () => {
    await module?.close();
    await stopPostgresContainer();
  });

  async function createProcessingDepot() {
    const depot = await depots.createDepot({
      nomOriginalFichier: 'test.xml',
      tailleFichier: 1024,
      type: 'application/xml',
    });
    await workflow.startProcessing(depot.id);
    return depot;
  }

  it('serializes concurrent finalizations and enqueues only once', async () => {
    const depot = await createProcessingDepot();
    const finalize = () => workflow.completeBusinessControls(depot.id, { success: true, filePath: 'test.xml' });
    expect((await Promise.all([finalize(), finalize()])).sort()).toEqual([false, true]);
    expect(queue.send).toHaveBeenCalledTimes(1);
    expect((await depots.findDepotById(depot.id))?.stepHistory).toEqual([
      DepotStep.PENDING,
      DepotStep.CONTROLE_IN_PROGRESS,
      DepotStep.CONTROLE_COMPLETED,
    ]);
  });

  it.each([DepotStatus.REJETE, DepotStatus.INTEGRE, DepotStatus.INTEGRE_PARTIELLEMENT])(
    'does not reopen a %s depot or alter its history',
    async (status) => {
      const depot = await createProcessingDepot();
      await depots.updateDepot(depot.id, { status });
      expect(await workflow.completeBusinessControls(depot.id, { success: true, filePath: 'test.xml' })).toBe(false);
      expect((await depots.findDepotById(depot.id))?.stepHistory).toEqual([
        DepotStep.PENDING,
        DepotStep.CONTROLE_IN_PROGRESS,
      ]);
      expect(queue.send).not.toHaveBeenCalled();
    },
  );

  it.each(['throws', 'returns null'])('rolls back state and history when enqueue %s', async (failure) => {
    const depot = await createProcessingDepot();
    const before = await depots.findDepotById(depot.id);
    if (failure === 'throws') {
      queue.send.mockRejectedValueOnce(new Error('Enqueue failed'));
    } else {
      queue.send.mockResolvedValueOnce(null);
    }
    const finalize = () => workflow.completeBusinessControls(depot.id, { success: false, filePath: 'test.xml' });
    await expect(finalize()).rejects.toThrow();
    expect(await depots.findDepotById(depot.id)).toEqual(before);
    expect(await finalize()).toBe(true);
  });
});
