import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotRepository } from '@dossier/depot/depot.repository';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { DepotStep, DepotStatus } from '@lib/dossier';
import { FileProcessorService } from '@worker/fileProcessor/fileProcessor.service';
import { SftpProcessorService } from '@worker/sftp/sftpProcessor.service';
import { S3 } from '@infra/s3/s3';
import { Sftp } from '@infra/sftp/sftp';
import { QueueName, QueueGateway } from '@infra/queue/queue';
import { ControleSandreService } from '@dossier/controle/technique/sandre/sandre.controle';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { SandreAcceptationStatus } from '@lib/dossier';
import { LoggerService } from '@shared/logger/logger.service';
import { UserEntity } from '@user/user.entity';
import { ControleEntity } from '@dossier/controle/controle.entity';
import { ReponseSandreEntity } from '@dossier/controle/technique/sandre/reponseSandre.entity';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { startPostgresContainer, stopPostgresContainer, getPostgresConnectionUri } from './testcontainer.config';
import type { App } from 'supertest/types';

// Mock S3 service
class S3Mock implements S3 {
  private files: Map<string, Buffer> = new Map();

  async upload(key: string, body: Buffer | Uint8Array | string): Promise<void> {
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
    this.files.set(key, buffer);
    await Promise.resolve();
  }

  async download(key: string): Promise<Buffer> {
    const file = this.files.get(key);
    if (!file) {
      throw new Error(`File not found: ${key}`);
    }
    await Promise.resolve();
    return file;
  }

  // Helper to seed files for tests
  seed(key: string, content: string): void {
    this.files.set(key, Buffer.from(content));
  }
}

// Mock SFTP service
class SftpMock implements Sftp {
  calls: Array<{ file: Buffer; depotId: string }> = [];
  shouldFail = false;

  async send(file: Buffer, depotId: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('SFTP send failed');
    }
    this.calls.push({ file, depotId });
    await Promise.resolve();
  }
}

// Mock QueueService
class QueueServiceMock {
  calls: Array<{ name: string; data?: object }> = [];
  shouldFail = false;

  async send<TData = object>(name: string, data?: TData): Promise<string | null> {
    if (this.shouldFail) {
      throw new Error('Queue send failed');
    }
    this.calls.push({ name, data: data as object });
    await Promise.resolve();
    return 'job-id';
  }

  async work(): Promise<string> {
    await Promise.resolve();
    throw new Error('Not implemented in mock');
  }
}

// Mock ControleSandreService
class ControleSandreMock {
  acceptationStatus: SandreAcceptationStatus = SandreAcceptationStatus.CONFORMANT;

  async execute() {
    await Promise.resolve();
    return {
      isConformant: this.acceptationStatus === SandreAcceptationStatus.CONFORMANT,
      acceptationStatus: this.acceptationStatus,
      jeton: 'mock-jeton',
      codeScenario: '2A',
      versionScenario: '2024.1',
    };
  }
}

// Mock ControleV1Service
class ControleV1Mock {
  async execute() {
    await Promise.resolve();
    return [];
  }
}

// Mock RoseauGateway
class RoseauGatewayMock {
  findSteuBySandreCda() {
    return Promise.resolve(null);
  }
  findCxnAdmBySteuAndItv() {
    return Promise.resolve(null);
  }
}

describe('Worker Service (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let s3Mock: S3Mock;
  let sftpMock: SftpMock;
  let queueMock: QueueServiceMock;
  let sandreMock: ControleSandreMock;
  let fileProcessorService: FileProcessorService;
  let sftpProcessorService: SftpProcessorService;

  beforeAll(async () => {
    await startPostgresContainer();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: getPostgresConnectionUri(),
          dropSchema: true,
          entities: [DepotEntity, UserEntity, ControleEntity, ReponseSandreEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([DepotEntity, UserEntity, ControleEntity, ReponseSandreEntity]),
      ],
      providers: [
        LoggerService,
        FileProcessorService,
        SftpProcessorService,
        DepotService,
        DepotRepository,
        { provide: DepotGateway, useExisting: DepotRepository },
        { provide: S3, useClass: S3Mock },
        { provide: Sftp, useClass: SftpMock },
        { provide: QueueGateway, useClass: QueueServiceMock },
        { provide: ControleSandreService, useClass: ControleSandreMock },
        { provide: ControleV1Service, useClass: ControleV1Mock },
        { provide: RoseauGateway, useClass: RoseauGatewayMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    s3Mock = moduleFixture.get<S3>(S3) as S3Mock;
    sftpMock = moduleFixture.get<Sftp>(Sftp) as SftpMock;
    queueMock = moduleFixture.get<QueueServiceMock>(QueueGateway);
    sandreMock = moduleFixture.get<ControleSandreMock>(ControleSandreService);
    fileProcessorService = moduleFixture.get(FileProcessorService);
    sftpProcessorService = moduleFixture.get(SftpProcessorService);
  });

  afterAll(async () => {
    await app?.close();
    await stopPostgresContainer();
  });

  describe('FileProcessorService', () => {
    it('should process file successfully and enqueue SFTP job', async () => {
      // Create depot
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_test_001',
        path: 'test_file.xml',
        nomOriginalFichier: 'test_file.xml',
        type: 'application/xml',
        tailleFichier: 1024,
        status: DepotStatus.PENDING,
        step: DepotStep.UPLOADING_TO_S3,
      });

      // Seed S3 with XML file
      const xmlContent = `<?xml version="1.0"?>
<Scenario xmlns="http://www.sandre.eaufrance.fr/2A/2024.1">
  <Emetteur>
    <Contact>
      <NomContact>Test</NomContact>
    </Contact>
  </Emetteur>
</Scenario>`;
      s3Mock.seed('test_file.xml', xmlContent);

      // Reset mocks
      queueMock.calls = [];
      sandreMock.acceptationStatus = SandreAcceptationStatus.CONFORMANT;

      // Process file
      await fileProcessorService.process({
        depotId: depot.id,
        filePath: 'test_file.xml',
        utilisateur: { nom: 'Test', prenom: 'User' },
      });

      // Verify depot status updated
      const updatedDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depot.id },
      });
      expect(updatedDepot.status).toBe(DepotStatus.PROCESSING);
      expect(updatedDepot.step).toBe(DepotStep.CONTROLE_IN_PROGRESS);

      // Verify jobs enqueued
      expect(queueMock.calls).toHaveLength(2);
      expect(queueMock.calls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: QueueName.controle_metier,
            data: {
              depotId: depot.id,
              filePath: 'test_file.xml',
            },
          }),
          expect.objectContaining({
            name: QueueName.controle_sandre,
            data: {
              depotId: depot.id,
              filePath: 'test_file.xml',
            },
          }),
        ]),
      );
    });

    it('should handle processing errors gracefully', async () => {
      // Create depot
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_test_003',
        path: 'missing_file.xml',
        nomOriginalFichier: 'missing_file.xml',
        type: 'application/xml',
        tailleFichier: 1024,
        status: DepotStatus.PENDING,
        step: DepotStep.UPLOADING_TO_S3,
      });

      // Don't seed S3 - file will not be found
      queueMock.shouldFail = true;

      // Process file (should throw)
      await expect(
        fileProcessorService.process({
          depotId: depot.id,
          filePath: 'missing_file.xml',
          utilisateur: { nom: 'Test', prenom: 'User' },
        }),
      ).rejects.toThrow();

      // Verify depot status updated to FAILED
      const updatedDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depot.id },
      });
      expect(updatedDepot.status).toBe(DepotStatus.FAILED);
      expect(updatedDepot.step).toBe(DepotStep.CONTROLE_FAILED);
    });
  });

  describe('SftpProcessorService', () => {
    it('should send file to SFTP successfully', async () => {
      // Create depot
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_test_004',
        path: 'sftp_test.xml',
        nomOriginalFichier: 'sftp_test.xml',
        type: 'application/xml',
        tailleFichier: 1024,
        status: DepotStatus.PROCESSING,
        step: DepotStep.READY_FOR_SFTP,
      });

      // Seed S3 with file
      s3Mock.seed('sftp_test.xml', '<data>test</data>');

      // Reset mocks
      sftpMock.calls = [];
      sftpMock.shouldFail = false;

      // Process SFTP
      await sftpProcessorService.process({
        depotId: depot.id,
        filePath: 'sftp_test.xml',
      });

      // Verify depot status updated to SUCCESS
      const updatedDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depot.id },
      });
      expect(updatedDepot.status).toBe(DepotStatus.SUCCESS);
      expect(updatedDepot.step).toBe(DepotStep.SFTP_COMPLETED);

      // Verify SFTP was called
      expect(sftpMock.calls).toHaveLength(1);
      expect(sftpMock.calls[0].depotId).toBe(depot.id);
    });

    it('should handle SFTP failures', async () => {
      // Create depot
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_test_005',
        path: 'sftp_fail.xml',
        nomOriginalFichier: 'sftp_fail.xml',
        type: 'application/xml',
        tailleFichier: 1024,
        status: DepotStatus.PROCESSING,
        step: DepotStep.READY_FOR_SFTP,
      });

      // Seed S3 with file
      s3Mock.seed('sftp_fail.xml', '<data>test</data>');

      // Reset mocks
      sftpMock.calls = [];
      sftpMock.shouldFail = true;

      // Process SFTP (should throw)
      await expect(
        sftpProcessorService.process({
          depotId: depot.id,
          filePath: 'sftp_fail.xml',
        }),
      ).rejects.toThrow('SFTP send failed');

      // Verify depot status updated to FAILED
      const updatedDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depot.id },
      });
      expect(updatedDepot.status).toBe(DepotStatus.FAILED);
      expect(updatedDepot.step).toBe(DepotStep.SFTP_FAILED);
    });
  });
});
