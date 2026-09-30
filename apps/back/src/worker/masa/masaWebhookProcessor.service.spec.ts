/* eslint-disable @typescript-eslint/unbound-method */
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { MasaStatus } from '@dossier/masa/masa.model';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { DepotModel } from '@dossier/depot/depot.model';
import { DepotUploadGateway, type DepotUploadTransaction } from '@dossier/depot/depotUpload.gateway';
import { DepotUploadRepository } from '@dossier/depot/depotUpload.repository';
import type { DataSource, EntityManager } from 'typeorm';
import { DepotStatus, DepotStep, EtapeMetier } from '@lib/dossier';
import { QueueGateway, QueueName, RapportDestinataire } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MasaWebhookProcessorService } from './masaWebhookProcessor.service';

const awaitingMasaDepot = {
  id: 'depot_1',
  status: DepotStatus.EN_COURS_DE_TRAITEMENT,
  step: DepotStep.SFTP_COMPLETED,
  stepHistory: [DepotStep.PENDING, DepotStep.SFTP_COMPLETED],
  etapeMetier: EtapeMetier.FINALISATION_IMPORT,
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
  let databaseDepot: Parameters<DepotUploadTransaction['save']>[0];
  let committedJobs: object[];
  let databaseTransaction: jest.Mock;
  let save: jest.Mock;
  let findOne: jest.Mock;
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
      send: jest
        .fn()
        .mockImplementation(async (_name: string, data: object, options?: Parameters<Queue['send']>[2]) => {
          await options!.db!.executeSql('INSERT INTO job', [data]);
          return 'job_1';
        }),
      work: jest.fn(),
    };

    databaseDepot = { ...awaitingMasaDepot };
    committedJobs = [];
    save = jest.fn();
    findOne = jest.fn();
    let previousTransaction = Promise.resolve();
    // Model commit/rollback and serialization, but exercise the real repository's
    // lock and transaction-bound pg-boss adapter rather than mocking that gateway.
    databaseTransaction = jest.fn(async (operation: (manager: EntityManager) => Promise<unknown>) => {
      const previous = previousTransaction;
      let release!: () => void;
      previousTransaction = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      let stagedDepot = { ...databaseDepot };
      const stagedJobs: object[] = [];
      findOne.mockImplementation(() => Promise.resolve({ ...stagedDepot }));
      save.mockImplementation((depot: Parameters<DepotUploadTransaction['save']>[0]) => {
        stagedDepot = { ...depot };
        return Promise.resolve(depot);
      });
      const manager = {
        getRepository: () => ({ create: (depot: DepotModel) => depot, save, findOne }),
        query: jest.fn((_sql: string, values: object[]) => {
          stagedJobs.push(values[0]);
          return Promise.resolve([{ id: 'job_1' }]);
        }),
      } as unknown as EntityManager;
      try {
        const result = await operation(manager);
        databaseDepot = stagedDepot;
        committedJobs.push(...stagedJobs);
        return result;
      } finally {
        release();
      }
    });
    const depotUploadGateway = new DepotUploadRepository(
      { transaction: databaseTransaction } as unknown as DataSource,
      queueService,
    );

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
        { provide: DepotUploadGateway, useValue: depotUploadGateway },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get(MasaWebhookProcessorService);
  });

  it('should enqueue rapport diffusion to deposant and agence de eau after accepted MASA processing', async () => {
    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'depot_1',
        status: DepotStatus.INTEGRE,
        step: DepotStep.MASA_CALLED_ENPOINT,
        etapeMetier: null,
      }),
    );
    expect(queueService.send).toHaveBeenCalledWith(
      QueueName.diffusion_rapport,
      {
        depotId: 'depot_1',
        masaId: 'masa_1',
        destinataires: [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU],
      },
      expect.objectContaining({ db: { executeSql: expect.any(Function) as unknown } }),
    );
    expect(findOne).toHaveBeenCalledWith({ where: { id: 'depot_1' }, lock: { mode: 'pessimistic_write' } });
    expect(committedJobs).toHaveLength(1);
    expect(databaseDepot.stepHistory).toEqual([
      DepotStep.PENDING,
      DepotStep.SFTP_COMPLETED,
      DepotStep.MASA_CALLED_ENPOINT,
    ]);
    expect(depotGateway.updateDepot).not.toHaveBeenCalled();
    expect(databaseDepot.etapeMetier).toBeNull();
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

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'depot_1',
        status: DepotStatus.REJETE,
        step: DepotStep.MASA_CALLED_ENPOINT,
        etapeMetier: null,
      }),
    );
    expect(queueService.send).toHaveBeenCalledWith(
      QueueName.diffusion_rapport,
      {
        depotId: 'depot_1',
        masaId: 'masa_1',
        destinataires: [RapportDestinataire.DEPOSANT],
      },
      expect.objectContaining({ db: { executeSql: expect.any(Function) as unknown } }),
    );
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

    expect(save).toHaveBeenCalledTimes(1);
    expect(queueService.send).toHaveBeenCalledTimes(1);
  });

  it('rolls back the depot transition on enqueue failure and lets the retry enqueue the report', async () => {
    queueService.send.mockRejectedValueOnce(new Error('queue unavailable'));

    await expect(service.process({ masaId: 'masa_1', depotId: 'depot_1' })).rejects.toThrow('queue unavailable');
    expect(databaseDepot).toEqual(awaitingMasaDepot);
    expect(committedJobs).toHaveLength(0);

    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });
    expect(databaseDepot.status).toBe(DepotStatus.INTEGRE);
    expect(committedJobs).toHaveLength(1);
  });

  it('treats a null job id as an enqueue failure and rolls back the depot transition', async () => {
    queueService.send.mockResolvedValueOnce(null);

    await expect(service.process({ masaId: 'masa_1', depotId: 'depot_1' })).rejects.toThrow(
      'Failed to enqueue diffusion_rapport',
    );
    expect(databaseDepot).toEqual(awaitingMasaDepot);
    expect(committedJobs).toHaveLength(0);

    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });
    expect(committedJobs).toHaveLength(1);
  });

  it('rolls back both the report insert and the transition on failure before transaction commit', async () => {
    queueService.send.mockImplementationOnce(async (_name, data, options) => {
      await options!.db!.executeSql('INSERT INTO job', [data]);
      throw new Error('interrupted before commit');
    });

    await expect(service.process({ masaId: 'masa_1', depotId: 'depot_1' })).rejects.toThrow(
      'interrupted before commit',
    );
    expect(databaseDepot).toEqual(awaitingMasaDepot);
    expect(committedJobs).toHaveLength(0);

    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });
    expect(committedJobs).toHaveLength(1);
  });

  it('rechecks the state under the lock when another worker completed after the initial read', async () => {
    databaseDepot = { ...integratedDepot };

    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

    expect(findOne).toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(queueService.send).not.toHaveBeenCalled();
  });

  it('serializes concurrent deliveries and commits only one report job', async () => {
    await Promise.all([
      service.process({ masaId: 'masa_1', depotId: 'depot_1' }),
      service.process({ masaId: 'masa_1', depotId: 'depot_1' }),
    ]);

    expect(databaseTransaction).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledTimes(1);
    expect(queueService.send).toHaveBeenCalledTimes(1);
    expect(committedJobs).toHaveLength(1);
  });
});
