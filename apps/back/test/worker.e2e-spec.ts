import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { AntivirusAnalysisEntity } from '@dossier/depot/antivirusAnalysis.entity';
import { DepotAntivirusGateway } from '@dossier/depot/depotAntivirus.gateway';
import { DepotAntivirusRepository } from '@dossier/depot/depotAntivirus.repository';
import { DepotUploadGateway } from '@dossier/depot/depotUpload.gateway';
import { DepotUploadRepository } from '@dossier/depot/depotUpload.repository';
import { AntivirusGateway } from '@infra/antivirus/antivirus.gateway';
import { MockAntivirusGateway } from '@infra/antivirus/antivirus.mock';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotRepository } from '@dossier/depot/depot.repository';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { ControleName, ControleType, DepotStep, DepotStatus, ErrorCode, EvenementType } from '@lib/dossier';
import { FileProcessorService } from '@worker/fileProcessor/fileProcessor.service';
import { AntivirusProcessorService } from '@worker/antivirus/antivirusProcessor.service';
import { SftpAgentVerseauProcessorService } from '@worker/sftp/sftpAgentVerseauProcessor.service';
import { DiffusionRapportProcessorService } from '@worker/diffusionRapport/diffusionRapportProcessor.service';
import { RapportPdfGeneratorService } from '@dossier/rapport/rapportPdfGenerator.service';
import { MasaGateway } from '@dossier/masa/masa.gateway';
import { NotificationGateway } from '@notification/notification.gateway';
import { ControleGateway } from '@dossier/controle/controle.gateway';
import { S3 } from '@infra/s3/s3';
import { AgentVerseauClient } from '@infra/agentVerseauClient/agentVerseauClient';
import { QueueName, QueueGateway, RapportDestinataire } from '@infra/queue/queue';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { LoggerService } from '@shared/logger/logger.service';
import { UserEntity } from '@user/user.entity';
import { ControleEntity } from '@dossier/controle/controle.entity';
import { ReponseSandreEntity } from '@dossier/controle/technique/sandre/reponseSandre.entity';
import { ReponseSandreGateway } from '@dossier/controle/technique/sandre/reponseSandre.gateway';
import { ReponseSandreRepository } from '@dossier/controle/technique/sandre/reponseSandre.repository';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { DroitsDepotService } from '@dossier/depot/droitsDepot.service';
import { UserService } from '@user/user.service';
import { startPostgresContainer, getPostgresConnectionUri } from './testcontainer.config';
import type { App } from 'supertest/types';
import { MasaEntity } from '@dossier/masa/masa.entity';
import { AgenceEauClient } from '@infra/agenceEauClient/agenceEauClient';
import { MasaProvider } from '@masa/masa.provider';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { loggerProviderMock } from '@shared/logger/logger.mock';
import { Zip } from '@shared/zip/zip';
import { ZipService } from '@shared/zip/zip.service';

// Import shared mocks
import {
  S3TestMock,
  TransferClientTestMock,
  QueueTestMock,
  RoseauGatewayTestMock,
  ControleV1TestMock,
  DroitsDepotServiceTestMock,
  UserServiceTestMock,
  NotificationGatewayTestMock,
  MasaGatewayTestMock,
  ControleGatewayTestMock,
  AgenceEauClientTestMock,
  MasaProviderTestMock,
  LanceleauGatewayTestMock,
} from './mock/shared-mocks';

describe('Worker Service (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let s3Mock: S3TestMock;
  let agentVerseauClientMock: TransferClientTestMock;
  let agenceEauClientMock: AgenceEauClientTestMock;
  let masaProviderMock: MasaProviderTestMock;
  let queueMock: QueueTestMock;
  let notificationMock: NotificationGatewayTestMock;
  let masaGatewayMock: MasaGatewayTestMock;
  let controleGatewayMock: ControleGatewayTestMock;
  let fileProcessorService: FileProcessorService;
  let sftpProcessorService: SftpAgentVerseauProcessorService;
  let diffusionRapportProcessorService: DiffusionRapportProcessorService;

  beforeAll(async () => {
    await startPostgresContainer();

    s3Mock = new S3TestMock();
    agentVerseauClientMock = new TransferClientTestMock();
    agenceEauClientMock = new AgenceEauClientTestMock();
    masaProviderMock = new MasaProviderTestMock();
    queueMock = new QueueTestMock();
    notificationMock = new NotificationGatewayTestMock();
    masaGatewayMock = new MasaGatewayTestMock();
    controleGatewayMock = new ControleGatewayTestMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: getPostgresConnectionUri(),
          dropSchema: true,
          entities: [DepotEntity, AntivirusAnalysisEntity, UserEntity, ControleEntity, ReponseSandreEntity, MasaEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([
          DepotEntity,
          AntivirusAnalysisEntity,
          UserEntity,
          ControleEntity,
          ReponseSandreEntity,
          MasaEntity,
        ]),
      ],
      providers: [
        LoggerService,
        FileProcessorService,
        AntivirusProcessorService,
        { provide: ConfigService, useValue: new ConfigService({ ANTIVIRUS_BYPASS: 'false' }) },
        { provide: AntivirusGateway, useClass: MockAntivirusGateway },
        { provide: DepotAntivirusGateway, useClass: DepotAntivirusRepository },
        { provide: DepotUploadGateway, useClass: DepotUploadRepository },
        SftpAgentVerseauProcessorService,
        DiffusionRapportProcessorService,
        RapportPdfGeneratorService,
        { provide: DroitsDepotService, useClass: DroitsDepotServiceTestMock },
        { provide: UserService, useClass: UserServiceTestMock },
        DepotService,
        DepotRepository,
        ReponseSandreRepository,
        { provide: ReponseSandreGateway, useExisting: ReponseSandreRepository },
        { provide: DepotGateway, useExisting: DepotRepository },
        { provide: NotificationGateway, useValue: notificationMock },
        { provide: MasaGateway, useValue: masaGatewayMock },
        { provide: ControleGateway, useValue: controleGatewayMock },
        { provide: S3, useValue: s3Mock },
        { provide: AgentVerseauClient, useValue: agentVerseauClientMock },
        { provide: AgenceEauClient, useValue: agenceEauClientMock },
        ZipService,
        { provide: Zip, useExisting: ZipService },
        { provide: MasaProvider, useValue: masaProviderMock },
        { provide: QueueGateway, useValue: queueMock },
        { provide: ControleV1Service, useClass: ControleV1TestMock },
        { provide: RoseauGateway, useClass: RoseauGatewayTestMock },
        { provide: LanceleauGateway, useClass: LanceleauGatewayTestMock },
        loggerProviderMock,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    fileProcessorService = moduleFixture.get(FileProcessorService);
    sftpProcessorService = moduleFixture.get(SftpAgentVerseauProcessorService);
    diffusionRapportProcessorService = moduleFixture.get(DiffusionRapportProcessorService);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('FileProcessorService', () => {
    it('bypasses scanning, commits one ignored handoff, processes and permits downloading the XML', async () => {
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_bypassed_scan',
        path: 'depots/dep_bypassed_scan/file.xml',
        nomOriginalFichier: 'file.xml',
        type: 'application/xml',
        tailleFichier: 7,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.PENDING,
      });
      s3Mock.seed(depot.path, '<root/>');
      queueMock.reset();
      const configSpy = jest.spyOn(app.get(ConfigService), 'get').mockReturnValue('true');
      const scanSpy = jest.spyOn(app.get<AntivirusGateway>(AntivirusGateway), 'scanStream');
      const streamSpy = jest.spyOn(s3Mock, 'downloadStream');
      const job = {
        depotId: depot.id,
        filePath: depot.path,
        utilisateur: { id: 'user_001', nom: 'Test', prenom: 'User' },
      };
      try {
        const scanner = app.get(AntivirusProcessorService);
        await Promise.all([scanner.process(job), scanner.process(job)]);
        await scanner.exhausted(job);
        expect(scanSpy).not.toHaveBeenCalled();
        expect(streamSpy).not.toHaveBeenCalled();
        expect(queueMock.jobs).toEqual([expect.objectContaining({ name: QueueName.process_file })]);
        expect((await app.get(DepotService).findById(depot.id)).antivirusAnalysis).toMatchObject({
          status: 'ignored',
          scannedAt: null,
          sha256: null,
          engineVersion: null,
        });
        queueMock.reset();
        await fileProcessorService.process(job);
        expect(queueMock.jobs).toEqual([expect.objectContaining({ name: QueueName.controle_metier })]);
        await expect(app.get(DepotService).downloadXml(depot.id)).resolves.toEqual(Buffer.from('<root/>'));
      } finally {
        configSpy.mockRestore();
        scanSpy.mockRestore();
        streamSpy.mockRestore();
      }
    });

    it('rolls back scan evidence if enqueue fails, then commits one clean handoff on retry', async () => {
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_atomic_scan',
        path: 'depots/dep_atomic_scan/file.xml',
        nomOriginalFichier: 'file.xml',
        type: 'application/xml',
        tailleFichier: 7,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.PENDING,
      });
      s3Mock.seed(depot.path, '<root/>');
      queueMock.reset();
      const job = {
        depotId: depot.id,
        filePath: depot.path,
        utilisateur: { id: 'user_001', nom: 'Test', prenom: 'User' },
      };
      const scanner = app.get(AntivirusProcessorService);
      queueMock.setFailure(true);
      try {
        await expect(scanner.process(job, { retryCount: 0, retryLimit: 3 })).rejects.toThrow('ANTIVIRUS_RETRY');
      } finally {
        queueMock.setFailure(false);
      }
      expect(await dataSource.getRepository(AntivirusAnalysisEntity).countBy({ depotId: depot.id })).toBe(0);
      expect((await app.get(DepotService).findById(depot.id)).step).toBe(DepotStep.PENDING);
      await scanner.process(job, { retryCount: 1, retryLimit: 3 });
      await scanner.process(job, { retryCount: 2, retryLimit: 3 });
      await scanner.exhausted(job);
      expect(queueMock.jobs).toEqual([expect.objectContaining({ name: QueueName.process_file })]);
      expect((await app.get(DepotService).findById(depot.id)).antivirusAnalysis?.status).toBe('clean');
      expect((await app.get(DepotService).findById(depot.id)).status).toBe(DepotStatus.EN_COURS_DE_TRAITEMENT);
    });

    it('commits only one process_file job for concurrent antivirus attempts under real depot row locks', async () => {
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_concurrent_scan',
        path: 'depots/dep_concurrent_scan/file.xml',
        nomOriginalFichier: 'file.xml',
        type: 'application/xml',
        tailleFichier: 7,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.PENDING,
      });
      s3Mock.seed(depot.path, '<root/>');
      queueMock.reset();
      const job = {
        depotId: depot.id,
        filePath: depot.path,
        utilisateur: { id: 'user_001', nom: 'Test', prenom: 'User' },
      };
      await Promise.all([
        app.get(AntivirusProcessorService).process(job, { retryCount: 0, retryLimit: 3 }),
        app.get(AntivirusProcessorService).process(job, { retryCount: 0, retryLimit: 3 }),
      ]);
      expect(queueMock.jobs).toEqual([expect.objectContaining({ name: QueueName.process_file })]);
      queueMock.reset();
      await fileProcessorService.process(job);
      expect(queueMock.jobs).toEqual([expect.objectContaining({ name: QueueName.controle_metier })]);
      expect(await dataSource.getRepository(AntivirusAnalysisEntity).countBy({ depotId: depot.id })).toBe(1);
    });

    it('rejects the depot and preserves clean evidence when business-control enqueue fails', async () => {
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_enqueue_recovery',
        path: 'depots/dep_enqueue_recovery/file.xml',
        nomOriginalFichier: 'file.xml',
        type: 'application/xml',
        tailleFichier: 7,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.PENDING,
      });
      s3Mock.seed(depot.path, '<root/>');
      queueMock.reset();
      const job = {
        depotId: depot.id,
        filePath: depot.path,
        utilisateur: { id: 'user_001', nom: 'Test', prenom: 'User' },
      };
      await app.get(AntivirusProcessorService).process(job, { retryCount: 0, retryLimit: 3 });
      queueMock.reset();
      queueMock.setFailure(true);
      try {
        await expect(fileProcessorService.process(job)).rejects.toThrow('Queue send failed');
      } finally {
        queueMock.setFailure(false);
      }
      expect((await app.get(DepotService).findById(depot.id)).status).toBe(DepotStatus.REJETE);
      expect((await app.get(DepotService).findById(depot.id)).step).toBe(DepotStep.CONTROLE_FAILED);
      expect((await app.get(DepotService).findById(depot.id)).antivirusAnalysis?.status).toBe('clean');
      expect(queueMock.jobs).toHaveLength(0);
    });

    it('should process file successfully and enqueue business controls', async () => {
      // Create depot
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_test_001',
        path: 'test_file.xml',
        nomOriginalFichier: 'test_file.xml',
        type: 'application/xml',
        tailleFichier: 1024,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.PENDING,
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
      const job = {
        depotId: depot.id,
        filePath: 'test_file.xml',
        utilisateur: { id: 'user_001', nom: 'Test', prenom: 'User' },
      };
      await app.get(AntivirusProcessorService).process(job);
      queueMock.reset();
      await fileProcessorService.process(job);

      // Verify depot status updated
      const updatedDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depot.id },
      });
      expect(updatedDepot.status).toBe(DepotStatus.EN_COURS_DE_TRAITEMENT);
      expect(updatedDepot.step).toBe(DepotStep.CONTROLE_IN_PROGRESS);

      // Verify jobs enqueued (sequential flow: only the business control is dispatched,
      // the SANDRE control is dispatched by the business control processor on success)
      expect(queueMock.jobs).toHaveLength(1);
      expect(queueMock.jobs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: QueueName.controle_metier,
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
        step: DepotStep.PENDING,
      });

      // Don't seed S3 - file will not be found
      queueMock.reset();

      // The processor rejects the depot and propagates the storage failure to the worker.
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

      expect(queueMock.jobs).toHaveLength(0);
    });
  });

  describe('SftpProcessorService', () => {
    let sftpUser: UserEntity;

    beforeEach(async () => {
      sftpUser = await dataSource.getRepository(UserEntity).save({
        id: 'user_sftp_processor',
        sub: 'sftp-user-sub',
        email: 'sftp-user@example.com',
        nom: 'Cerbere',
        prenom: 'Contact',
      });
    });

    it('should send file to SFTP successfully', async () => {
      // Create depot
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_test_004',
        path: 'depots/dep_test_004/file.xml',
        nomOriginalFichier: 'sftp_test.xml',
        type: 'application/xml',
        tailleFichier: 1024,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.READY_FOR_SFTP,
        userId: sftpUser.id,
      });

      // Seed S3 with file
      s3Mock.seed(depot.path, '<data>test</data>');

      // Reset mocks
      agentVerseauClientMock.reset();

      // Process SFTP
      await sftpProcessorService.process({
        depotId: depot.id,
        filePath: depot.path,
      });

      // Verify depot status stays EN_COURS_DE_TRAITEMENT (waiting for MASA)
      const updatedDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depot.id },
      });
      expect(updatedDepot.status).toBe(DepotStatus.EN_COURS_DE_TRAITEMENT);
      expect(updatedDepot.step).toBe(DepotStep.SFTP_COMPLETED);
      // Verify SFTP was called
      expect(agentVerseauClientMock.calls).toHaveLength(2);
      expect(agentVerseauClientMock.calls[0].fileName).toBe(`${depot.id}_sftp_test.xml`);
      expect(agentVerseauClientMock.calls[1].fileName).toBe(`${depot.id}_sftp_test.xml.ack`);
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
        userId: sftpUser.id,
      });

      // Seed S3 with file
      s3Mock.seed('sftp_fail.xml', '<data>test</data>');

      // Reset mocks and configure failure
      agentVerseauClientMock.reset();
      agentVerseauClientMock.setFailure(true);

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

  describe('DiffusionRapportProcessorService', () => {
    it('should generate and diffuse rapport for a rejected depot without MASA', async () => {
      // Create user
      const user = await dataSource.getRepository(UserEntity).save({
        id: 'user_diff_001',
        sub: 'sub_diff_001',
        email: 'test.deposant@example.com',
        nom: 'Deposant',
        prenom: 'Test',
      });

      // Create depot that was rejected
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_test_diff_001',
        path: 'rejected_file.xml',
        nomOriginalFichier: 'rejected_file.xml',
        type: 'application/xml',
        tailleFichier: 1024,
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_FAILED,
        user,
      });

      // Mock dependencies
      s3Mock.reset();
      notificationMock.reset();
      agentVerseauClientMock.reset();
      agenceEauClientMock.reset();
      masaProviderMock.reset();
      // Seed original file for SFTP transfer simulation
      s3Mock.seed('rejected_file.xml', '<data>test</data>');

      // Set mock for controles (e.g., an error occurred)
      controleGatewayMock.findByDepotId.mockResolvedValue([
        {
          id: 'ctrl_001',
          name: ControleName.CTL005,
          type: ControleType.CONTROLE_V1,
          success: false,
          evenementType: EvenementType.ERREUR,
          error: ErrorCode.E2_033,
          errorParams: ['99', '1A', '0600000001'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Process the diffusion rapport (no masaId provided)
      await diffusionRapportProcessorService.process({
        depotId: depot.id,
        destinataires: [RapportDestinataire.DEPOSANT],
      });

      // Verify PDF was generated and uploaded
      expect(s3Mock.uploads.length).toBeGreaterThan(0);
      const pdfUpload = s3Mock.uploads.find((u) => u.key.endsWith('.pdf'));
      expect(pdfUpload).toBeDefined();

      // Verify Email was sent to Deposant
      expect(notificationMock.sendEmail).toHaveBeenCalledTimes(1);
      expect(notificationMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Rapport de rejet du dépôt',
        }),
        expect.anything(),
      );

      // Verify Depot step was updated
      const updatedDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depot.id },
      });
      expect(updatedDepot.step).toBe(DepotStep.SEND_EMAIL_TO_DEPOSANT);
    });

    it('should generate and diffuse rapport for a depot with MASA', async () => {
      // Create user
      const user = await dataSource.getRepository(UserEntity).save({
        id: 'user_diff_002',
        sub: 'sub_diff_002',
        email: 'test.deposant2@example.com',
        nom: 'Deposant2',
        prenom: 'Test2',
      });

      // Create depot
      const depot = await dataSource.getRepository(DepotEntity).save({
        id: 'dep_test_diff_002',
        path: 'valid_file.xml',
        nomOriginalFichier: 'valid_file.xml',
        type: 'application/xml',
        tailleFichier: 1024,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.MASA_CALLED_ENPOINT,
        user,
      });

      // Set MASA mock
      masaGatewayMock.findById.mockResolvedValue({
        id: 'masa_001',
        statut: 'INTEGRE',
        statutMasa: 'Intégré',
        numeroDepotVerseau1: 'V1-999',
        rapport: 'Ok',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock dependencies
      s3Mock.reset();
      notificationMock.reset();
      agentVerseauClientMock.reset();
      agenceEauClientMock.reset();
      masaProviderMock.reset();
      s3Mock.seed('valid_file.xml', '<data>test</data>');
      controleGatewayMock.findByDepotId.mockResolvedValue([]);

      // Process the diffusion rapport with MASA
      await diffusionRapportProcessorService.process({
        depotId: depot.id,
        masaId: 'masa_001',
        destinataires: [RapportDestinataire.DEPOSANT, RapportDestinataire.AGENCE_EAU],
      });

      // Verify Email was sent to Deposant with MASA subject
      expect(notificationMock.sendEmail).toHaveBeenCalledTimes(1);
      expect(notificationMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Rapport du dépôt V1-999',
        }),
        expect.anything(),
      );
    });
  });
});
