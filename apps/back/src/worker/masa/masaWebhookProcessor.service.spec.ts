/* eslint-disable @typescript-eslint/unbound-method */
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { MasaStatus } from '@dossier/masa/masa.model';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { DepotStatus, DepotStep } from '@lib/dossier';
import { QueueGateway, QueueName, RapportDestinataire } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MasaWebhookProcessorService } from './masaWebhookProcessor.service';

describe('MasaWebhookProcessorService', () => {
  let service: MasaWebhookProcessorService;
  let masaGateway: jest.Mocked<MasaGateway>;
  let depotGateway: jest.Mocked<DepotGateway>;
  let queueService: jest.Mocked<Queue>;

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
    } as unknown as jest.Mocked<MasaGateway>;

    depotGateway = {
      findDepotByIdWithUser: jest.fn().mockResolvedValue({ id: 'depot_1' }),
      updateDepot: jest.fn().mockResolvedValue({ id: 'depot_1' }),
    } as unknown as jest.Mocked<DepotGateway>;

    queueService = {
      send: jest.fn().mockResolvedValue('job_1'),
      work: jest.fn(),
    } as unknown as jest.Mocked<Queue>;

    const logger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as LoggerService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasaWebhookProcessorService,
        { provide: MasaGateway, useValue: masaGateway },
        { provide: DepotGateway, useValue: depotGateway },
        { provide: QueueGateway, useValue: queueService },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get(MasaWebhookProcessorService);
  });

  it('should enqueue rapport diffusion to deposant and agence de eau after accepted MASA processing', async () => {
    await service.process({ masaId: 'masa_1', depotId: 'depot_1' });

    expect(depotGateway.updateDepot).toHaveBeenCalledWith('depot_1', {
      status: DepotStatus.INTEGRE,
      step: DepotStep.MASA_CALLED_ENPOINT,
      etapeMetier: null,
    });
    expect(queueService.send).toHaveBeenCalledWith(QueueName.diffusion_rapport, {
      depotId: 'depot_1',
      masaId: 'masa_1',
      destinataires: [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU],
    });
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

    expect(depotGateway.updateDepot).toHaveBeenCalledWith('depot_1', {
      status: DepotStatus.REJETE,
      step: DepotStep.MASA_CALLED_ENPOINT,
      etapeMetier: null,
    });
    expect(queueService.send).toHaveBeenCalledWith(QueueName.diffusion_rapport, {
      depotId: 'depot_1',
      masaId: 'masa_1',
      destinataires: [RapportDestinataire.DEPOSANT],
    });
  });
});
