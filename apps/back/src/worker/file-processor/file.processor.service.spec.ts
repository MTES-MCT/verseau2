import { Test, TestingModule } from '@nestjs/testing';
import { FileProcessorService } from './file.processor.service';
import { S3 } from '@s3/s3';
import { ControleSandreService } from '@dossier/controle/technique/sandre/sandre.controle';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { QueueService } from '@queue/queue.service';
import { DepotService } from '@dossier/depot/depot.service';

describe('FileProcessorService', () => {
  let service: FileProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileProcessorService,
        { provide: S3, useValue: { download: jest.fn() } },
        { provide: ControleSandreService, useValue: { execute: jest.fn() } },
        { provide: ControleV1Service, useValue: { execute: jest.fn() } },
        { provide: QueueService, useValue: { send: jest.fn() } },
        { provide: DepotService, useValue: { update: jest.fn() } },
      ],
    }).compile();

    service = module.get<FileProcessorService>(FileProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
