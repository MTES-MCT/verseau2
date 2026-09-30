/* eslint-disable @typescript-eslint/unbound-method */
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { MasaStatus } from '@dossier/masa/masa.model';
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

describe('MasaWebhookProcessorService', () => {
  let service: MasaWebhookProcessorService;
  let masaGateway: jest.Mocked<MasaGateway>;
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
        { provide: QueueGateway, useValue: queueService },
        { provide: DepotUploadGateway, useValue: depotUploadGateway },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get(MasaWebhookProcessorService);
  });

  it.each([
    [MasaStatus.INTEGRE, DepotStatus.INTEGRE, [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU]],
    [
      MasaStatus.INTEGRATION_PARTIELLE,
      DepotStatus.INTEGRE_PARTIELLEMENT,
      [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU],
    ],
    [MasaStatus.REFUSE, DepotStatus.REJETE, [RapportDestinataire.DEPOSANT]],
  ])(
    'applies %s and atomically enqueues the report for the appropriate recipients',
    async (statut, status, destinataires) => {
      const masa = await masaGateway.findById('masa_1');
      masaGateway.findById.mockResolvedValue({ ...masa!, statut });
      await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'depot_1',
          status,
          step: DepotStep.MASA_CALLED_ENPOINT,
          etapeMetier: null,
        }),
      );
      expect(queueService.send).toHaveBeenCalledWith(
        QueueName.diffusion_rapport,
        {
          depotId: 'depot_1',
          masaId: 'masa_1',
          destinataires,
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
      expect(databaseDepot.etapeMetier).toBeNull();
    },
  );

  it.each([
    [DepotStatus.INTEGRE, DepotStep.MASA_CALLED_ENPOINT],
    [DepotStatus.INTEGRE_PARTIELLEMENT, DepotStep.SFTP_IN_PROGRESS],
    [DepotStatus.REJETE, DepotStep.SFTP_IN_PROGRESS],
    [DepotStatus.REJETE, DepotStep.SFTP_FAILED],
    [DepotStatus.EN_COURS_DE_TRAITEMENT, DepotStep.SFTP_FAILED],
    [DepotStatus.EN_COURS_DE_TRAITEMENT, DepotStep.READY_FOR_SFTP],
    [DepotStatus.EN_COURS_DE_TRAITEMENT, DepotStep.CONTROLE_COMPLETED],
  ])('does not transition unrelated or terminal depots (%s, %s)', async (status, step) => {
    databaseDepot = { ...awaitingMasaDepot, status, step };

    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

    expect(save).not.toHaveBeenCalled();
    expect(queueService.send).not.toHaveBeenCalled();
  });

  it('should be idempotent on duplicate deliveries once the depot has transitioned', async () => {
    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

    expect(save).toHaveBeenCalledTimes(1);
    expect(queueService.send).toHaveBeenCalledTimes(1);
  });

  it.each(['queue unavailable', 'null job ID', 'interrupted before commit'])(
    'rolls back the transition and report insert on %s, then succeeds on retry',
    async (failure) => {
      queueService.send.mockImplementationOnce(async (_name, data, options) => {
        if (failure === 'null job ID') {
          return null;
        }
        if (failure === 'interrupted before commit') {
          await options!.db!.executeSql('INSERT INTO job', [data]);
        }
        throw new Error(failure);
      });
      await expect(service.process({ masaId: 'masa_1', depotId: 'depot_1' })).rejects.toThrow(
        failure === 'null job ID' ? 'Failed to enqueue diffusion_rapport' : failure,
      );
      expect(databaseDepot).toEqual(awaitingMasaDepot);
      expect(committedJobs).toHaveLength(0);

      await service.process({ masaId: 'masa_1', depotId: 'depot_1' });
      expect(databaseDepot.status).toBe(DepotStatus.INTEGRE);
      expect(committedJobs).toHaveLength(1);
    },
  );

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

  it('retries the same early callback after SFTP completes, without creating a deferral job', async () => {
    databaseDepot = { ...awaitingMasaDepot, step: DepotStep.SFTP_IN_PROGRESS };
    const data = { masaId: 'masa_1', depotId: 'depot_1' };

    await expect(service.process(data)).rejects.toThrow('SFTP still in progress');
    expect(save).not.toHaveBeenCalled();
    expect(queueService.send).not.toHaveBeenCalled();
    databaseDepot.step = DepotStep.SFTP_COMPLETED;

    await service.process(data);
    await service.process(data);

    expect(databaseDepot.status).toBe(DepotStatus.INTEGRE);
    expect(save).toHaveBeenCalledTimes(1);
    expect(committedJobs).toHaveLength(1);
  });

  it('keeps an early callback retryable while SFTP remains in progress', async () => {
    databaseDepot = { ...awaitingMasaDepot, step: DepotStep.SFTP_IN_PROGRESS };

    await expect(service.process({ masaId: 'masa_1', depotId: 'depot_1' })).rejects.toThrow('SFTP still in progress');
    await expect(service.process({ masaId: 'masa_1', depotId: 'depot_1' })).rejects.toThrow('SFTP still in progress');

    expect(save).not.toHaveBeenCalled();
    expect(committedJobs).toHaveLength(0);
  });
});
