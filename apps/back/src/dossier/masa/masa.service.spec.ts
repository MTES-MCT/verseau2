/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { MasaGateway } from './masa.gateway';
import { MasaService } from './masa.service';
import { MasaStatus, MasaWebhookStatus, type MasaModel } from './masa.model';
import type { MasaWebhookPayloadDto } from './masa.schema';
import { DepotGateway } from '../depot/depot.gateway';
import type { DepotModel } from '../depot/depot.model';
import { DepotStatus, DepotStep } from '@lib/dossier';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';

const masaPayload = (statut: MasaWebhookStatus): MasaWebhookPayloadDto => ({
  verseau2DepotId: 'depot_1',
  numeroDepotVerseau1: 'V1-1',
  statut,
  rapport: '<p>rapport</p>',
});

const savedMasaRetour: MasaModel = {
  id: 'masa_saved',
  depotId: 'depot_1',
  numeroDepotVerseau1: 'V1-1',
  statut: MasaStatus.INTEGRE,
  statutMasa: MasaWebhookStatus.INTEGRE,
  rapport: '<p>rapport</p>',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
};

const existingMasaRetour = (statut: MasaStatus): MasaModel => ({
  ...savedMasaRetour,
  id: 'masa_existing',
  statut,
});

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

describe('MasaService.processRetourAgentVerseau', () => {
  let service: MasaService;
  let masaGateway: jest.Mocked<MasaGateway>;
  let depotGateway: jest.Mocked<DepotGateway>;
  let queueService: jest.Mocked<Queue>;
  let logger: { setContext: jest.Mock; log: jest.Mock; warn: jest.Mock; error: jest.Mock };

  beforeEach(async () => {
    masaGateway = {
      findById: jest.fn(),
      findByDepotId: jest.fn().mockResolvedValue(null),
      saveMasaRetour: jest.fn().mockResolvedValue(savedMasaRetour),
    };

    depotGateway = {
      findDepotById: jest.fn().mockResolvedValue(awaitingMasaDepot),
    } as unknown as jest.Mocked<DepotGateway>;

    queueService = {
      send: jest.fn().mockResolvedValue('job_1'),
      work: jest.fn(),
    };

    logger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasaService,
        { provide: MasaGateway, useValue: masaGateway },
        { provide: DepotGateway, useValue: depotGateway },
        { provide: QueueGateway, useValue: queueService },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get(MasaService);
  });

  describe('final status', () => {
    it('persists the MASA return and enqueues the processing job', async () => {
      const result = await service.processRetourAgentVerseau(masaPayload(MasaWebhookStatus.INTEGRE));

      expect(masaGateway.saveMasaRetour).toHaveBeenCalledWith({
        depotId: 'depot_1',
        numeroDepotVerseau1: 'V1-1',
        statut: MasaStatus.INTEGRE,
        statutMasa: MasaWebhookStatus.INTEGRE,
        rapport: '<p>rapport</p>',
      });
      expect(queueService.send).toHaveBeenCalledWith(QueueName.process_after_masa_webhook, {
        masaId: 'masa_saved',
        depotId: 'depot_1',
      });
      expect(result).toStrictEqual(savedMasaRetour);
    });

    it('still processes a final status received after a non-final one', async () => {
      await service.processRetourAgentVerseau(masaPayload(MasaWebhookStatus.DEPOSE));
      await service.processRetourAgentVerseau(masaPayload(MasaWebhookStatus.INTEGRE));

      expect(masaGateway.saveMasaRetour).toHaveBeenCalledTimes(1);
      expect(masaGateway.saveMasaRetour).toHaveBeenCalledWith(expect.objectContaining({ statut: MasaStatus.INTEGRE }));
      expect(queueService.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('non-final status', () => {
    it.each([
      MasaWebhookStatus.INITIALISE,
      MasaWebhookStatus.DEPOSE,
      MasaWebhookStatus.INTEGRABLE,
      MasaWebhookStatus.A_INTEGRER,
    ])('acknowledges %s without persisting a MASA row nor enqueuing a job', async (statut) => {
      const result = await service.processRetourAgentVerseau(masaPayload(statut));

      expect(masaGateway.saveMasaRetour).not.toHaveBeenCalled();
      expect(queueService.send).not.toHaveBeenCalled();
      expect(result).toStrictEqual({ processed: false, statutMasa: statut });
    });
  });

  describe('duplicate delivery of an already saved return', () => {
    it('repairs a failed enqueue by re-enqueueing when the depot still awaits the MASA return', async () => {
      masaGateway.findByDepotId.mockResolvedValue(existingMasaRetour(MasaStatus.INTEGRE));

      const result = await service.processRetourAgentVerseau(masaPayload(MasaWebhookStatus.INTEGRE));

      expect(masaGateway.saveMasaRetour).not.toHaveBeenCalled();
      expect(queueService.send).toHaveBeenCalledWith(QueueName.process_after_masa_webhook, {
        masaId: 'masa_existing',
        depotId: 'depot_1',
      });
      expect(result).toStrictEqual(existingMasaRetour(MasaStatus.INTEGRE));
    });

    it('does not re-enqueue when the return was already processed (depot transitioned)', async () => {
      masaGateway.findByDepotId.mockResolvedValue(existingMasaRetour(MasaStatus.INTEGRE));
      depotGateway.findDepotById.mockResolvedValue(integratedDepot);

      const result = await service.processRetourAgentVerseau(masaPayload(MasaWebhookStatus.INTEGRE));

      expect(queueService.send).not.toHaveBeenCalled();
      expect(result).toStrictEqual(existingMasaRetour(MasaStatus.INTEGRE));
    });
  });

  it('throws when the depot does not exist', async () => {
    depotGateway.findDepotById.mockResolvedValue(null);

    await expect(service.processRetourAgentVerseau(masaPayload(MasaWebhookStatus.INTEGRE))).rejects.toThrow(
      'Depot not found',
    );
  });
});
