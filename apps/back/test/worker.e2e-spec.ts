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
import { SftpAgentVerseauProcessorService } from '@worker/sftp/sftpAgentVerseauProcessor.service';
import { S3 } from '@infra/s3/s3';
import { Sftp } from '@infra/sftp/sftp';
import { QueueName, QueueGateway } from '@infra/queue/queue';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { SandreAcceptationStatus } from '@lib/dossier';
import { LoggerService } from '@shared/logger/logger.service';
import { UserEntity } from '@user/user.entity';
import { ControleEntity } from '@dossier/controle/controle.entity';
import { ReponseSandreEntity } from '@dossier/controle/technique/sandre/reponseSandre.entity';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { DroitsDepotService } from '@dossier/depot/droitsDepot.service';
import { UserService } from '@user/user.service';
import { startPostgresContainer, getPostgresConnectionUri } from './testcontainer.config';
import type { App } from 'supertest/types';
import { MasaEntity } from '@dossier/masa/masa.entity';
import { loggerProviderMock } from '@shared/logger/logger.mock';

// Import shared mocks
import {
  S3TestMock,
  SftpTestMock,
  QueueTestMock,
  RoseauGatewayTestMock,
  ControleV1TestMock,
  DroitsDepotServiceTestMock,
  UserServiceTestMock,
} from './mock/shared-mocks';

describe('Worker Service (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let s3Mock: S3TestMock;
  let sftpMock: SftpTestMock;
  let queueMock: QueueTestMock;
  let fileProcessorService: FileProcessorService;
  let sftpProcessorService: SftpAgentVerseauProcessorService;

  beforeAll(async () => {
    await startPostgresContainer();

    s3Mock = new S3TestMock();
    sftpMock = new SftpTestMock();
    queueMock = new QueueTestMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: getPostgresConnectionUri(),
          dropSchema: true,
          entities: [DepotEntity, UserEntity, ControleEntity, ReponseSandreEntity, MasaEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([DepotEntity, UserEntity, ControleEntity, ReponseSandreEntity, MasaEntity]),
      ],
      providers: [
        LoggerService,
        FileProcessorService,
        SftpAgentVerseauProcessorService,
        { provide: DroitsDepotService, useClass: DroitsDepotServiceTestMock },
        { provide: UserService, useClass: UserServiceTestMock },
        DepotService,
        DepotRepository,
        { provide: DepotGateway, useExisting: DepotRepository },
        { provide: S3, useValue: s3Mock },
        { provide: Sftp, useValue: sftpMock },
        { provide: QueueGateway, useValue: queueMock },
        { provide: ControleV1Service, useClass: ControleV1TestMock },
        { provide: RoseauGateway, useClass: RoseauGatewayTestMock },
        loggerProviderMock,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    fileProcessorService = moduleFixture.get(FileProcessorService);
    sftpProcessorService = moduleFixture.get(SftpAgentVerseauProcessorService);
  });

  afterAll(async () => {
    await app?.close();
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
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
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
      queueMock.reset();

      // Process file
      await fileProcessorService.process({
        depotId: depot.id,
        filePath: 'test_file.xml',
        utilisateur: { id: 'user_001', nom: 'Test', prenom: 'User' },
      });

      // Verify depot status updated
      const updatedDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depot.id },
      });
      expect(updatedDepot.status).toBe(DepotStatus.EN_COURS_DE_TRAITEMENT);
      expect(updatedDepot.step).toBe(DepotStep.CONTROLE_IN_PROGRESS);

      // Verify jobs enqueued
      expect(queueMock.jobs).toHaveLength(2);
      expect(queueMock.jobs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: QueueName.controle_metier,
            data: {
              depotId: depot.id,
              filePath: 'test_file.xml',
            },
          }),
          expect.objectContaining({
            name: QueueName.controle_sandre_upload,
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
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.UPLOADING_TO_S3,
      });

      // Don't seed S3 - file will not be found
      queueMock.setFailure(true);

      // Process file (should throw)
      await expect(
        fileProcessorService.process({
          depotId: depot.id,
          filePath: 'missing_file.xml',
          utilisateur: { id: 'user_001', nom: 'Test', prenom: 'User' },
        }),
      ).rejects.toThrow();

      // Verify depot status updated to FAILED
      const updatedDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depot.id },
      });
      expect(updatedDepot.status).toBe(DepotStatus.REJETE);
      expect(updatedDepot.step).toBe(DepotStep.CONTROLE_FAILED);

      // Reset failure state
      queueMock.setFailure(false);
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
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.READY_FOR_SFTP,
      });

      // Seed S3 with file
      s3Mock.seed('sftp_test.xml', '<data>test</data>');

      // Reset mocks
      sftpMock.reset();

      // Process SFTP
      await sftpProcessorService.process({
        depotId: depot.id,
        filePath: 'sftp_test.xml',
      });

      // Verify depot status stays EN_COURS_DE_TRAITEMENT (waiting for MASA)
      const updatedDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depot.id },
      });
      expect(updatedDepot.status).toBe(DepotStatus.EN_COURS_DE_TRAITEMENT);
      expect(updatedDepot.step).toBe(DepotStep.SFTP_COMPLETED);

      // Verify SFTP was called
      expect(sftpMock.calls).toHaveLength(1);
      expect(sftpMock.calls[0].depotId).toBe('sftp_test.xml');
    });

    it('should handle SFTP failures', async () => {
      // Create depot
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_test_005',
        path: 'sftp_fail.xml',
        nomOriginalFichier: 'sftp_fail.xml',
        type: 'application/xml',
        tailleFichier: 1024,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.READY_FOR_SFTP,
      });

      // Seed S3 with file
      s3Mock.seed('sftp_fail.xml', '<data>test</data>');

      // Reset mocks and configure failure
      sftpMock.reset();
      sftpMock.setFailure(true);

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
      expect(updatedDepot.status).toBe(DepotStatus.REJETE);
      expect(updatedDepot.step).toBe(DepotStep.SFTP_FAILED);
    });
  });
});
