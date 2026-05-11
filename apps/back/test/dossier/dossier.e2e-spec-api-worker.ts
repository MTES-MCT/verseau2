/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.join(__dirname, '../test.envfile'),
  override: true,
});

// Set environment before importing modules
process.env.USE_SANDRE_MOCK = 'true';
process.env.OIDC_MOCK = 'true';
process.env.S3_PROVIDER = 'mock';
process.env.SFTP_PROVIDER = 'mock';
process.env.SANDRE_POLL_INTERVAL_SECONDS = '0';

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import { PgBoss } from 'pg-boss';

import { DepotEntity } from '@dossier/depot/depot.entity';
import { DepotStatus, DepotStep, ControleStatus, ControleSandreStatus, ErrorCode, MasaStatus } from '@lib/dossier';
import { MasaService } from '@dossier/masa/masa.service';
import { QueueGateway, PGBOSS, QueueName, Queue } from '@infra/queue/queue';
import { S3 } from '@infra/s3/s3';
import { Sftp } from '@infra/sftp/sftp';
import { NotificationGateway } from '@notification/notification.gateway';
import { SandreService } from '@dossier/controle/technique/sandre/sandre.service';
import { ApiModule } from '../../src/api/api.module';
import { InfraModule } from '@infra/infra.module';
import { InfraWithRealDbMockModule } from '../mock/infraWithRealDbMock.module';
import { AuthenticationMiddleware } from '@authentication/authentication.middleware';
import { ThrottlerConfigModule } from '@infra/throttler/throttler.module';
import { WorkerModule } from '@worker/worker.module';
import { FileProcessorService } from '@worker/fileProcessor/fileProcessor.service';
import { ControleMetierProcessorService } from '@worker/controleMetier/controleMetierProcessor.service';
import { ControleSandrePollProcessorService } from '@worker/controleSandre/controle-sandre-poll.processor.service';

import { startPostgresContainer, getPostgresConnectionUri } from '../testcontainer.config';
import { initTestContainerImports } from '../init/initTestContainer';
import { createReferentielDataset, seedScl, seedSteu, seedTlref } from '../createReferentielDataset';
import { seedUserWithDroits, clearUserWithDroits, seedVSteuSclItv } from '../userWithDroitsDataset.helper';
import { waitForJobCompletion, waitFor, getJobsForDepot } from '../mock/queueTestHelper';

// Import shared mocks for infrastructure dependencies
import { S3TestMock, SftpTestMock, NotificationGatewayTestMock } from '../mock/shared-mocks';
import { DepotError } from '@dossier/depot/depotError';
import { seedDepotFull } from '../depot.helper';
import { clearControles } from '../controle.helper';
import { LoggerService } from '@shared/logger/logger.service';
import { loggerValueMock } from '@shared/logger/logger.mock';
import { ControleEntity } from '@dossier/controle/controle.entity';

/**
 * Real Queue Service implementation for testing.
 * Uses the real PgBoss instance.
 */
class RealQueueService implements Queue {
  constructor(private readonly pgboss: PgBoss) {}

  async send<TData = object>(
    name: string,
    data?: TData,
    options?: { startAfter?: number | string | Date },
  ): Promise<string | null> {
    const result = await this.pgboss.send(name, data as object, options);
    return result;
  }

  async work<TData>(
    name: string,
    options: { batchSize: number },
    handler: (job: Array<{ id: string; name: string; data: TData }>) => Promise<unknown>,
  ): Promise<string> {
    return await this.pgboss.work(name, { ...options, pollingIntervalSeconds: 0.5 }, handler);
  }
}

/**
 * E2E Test Suite with Real PgBoss Queue and Worker Processing
 *
 * This test suite uses the real PgBoss queue implementation backed by
 * a testcontainer PostgreSQL database. It tests the full asynchronous
 * file processing flow including:
 * - File upload and S3 storage
 * - Job enqueuing to PgBoss
 * - Worker picking up and processing jobs
 * - Control executions (métier and Sandre)
 * - SFTP dispatch after successful controls
 */
describe('Dossier E2E - Real Queue Processing', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let pgboss: PgBoss;
  let s3Mock: S3TestMock;
  let sftpMock: SftpTestMock;
  let notificationMock: NotificationGatewayTestMock;
  let sandreService: SandreService;
  let testUserId: string;

  // Test user data matching AuthenticationMockService.getMockUser()
  // itvRfa (SIRET) is required to pass DroitsDepotService.validateDroits()
  const TEST_USER = {
    sub: 'test-user-id',
    email: 'dev@example.com',
    nom: 'Test',
    prenom: 'User',
    itvCdn: 100,
    itvRfa: '12345678901234', // SIRET for the intervenant
  };

  // STEU and SCL codes used in test XMLs - must match VSteuSclItv entries
  const TEST_STEU_CODE = 'TEST_STEU_001';
  const TEST_SCL_CODE = 'TEST_SCL_001';
  const SANDRE_FAILED_STEU_CODE = 'TEST_STEU_SANDRE_FAIL_001';
  const SANDRE_FAILED_SCL_CODE = 'TEST_SCL_SANDRE_FAIL_001';

  type ConfigurableSandreMock = SandreService & {
    defaultBehavior?: 'conformant' | 'non-conformant' | 'random';
    clearValidationResults?: () => void;
  };

  // Minimal valid XML with OuvrageDepollution and SystemeCollecte for rights validation
  const validXmlWithRights = `<?xml version="1.0" encoding="UTF-8"?>
<FctAssain xsi:schemaLocation="http://xml.sandre.eaufrance.fr/scenario/fct_assain/4 http://xml.sandre.eaufrance.fr/scenario/fct_assain/4/sandre_sc_fct_assain.xsd" xmlns="http://xml.sandre.eaufrance.fr/scenario/fct_assain/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <Scenario>
        <CodeScenario>FCT_ASSAIN</CodeScenario>
        <VersionScenario>4</VersionScenario>
        <NomScenario>Test Scenario</NomScenario>
        <DateCreationFichier>2025-01-01</DateCreationFichier>
        <DateDebutReference>2024-01-01</DateDebutReference>
        <DateFinReference>2024-12-31</DateFinReference>
        <Emetteur>
            <CdIntervenant schemeAgencyID="SIRET">12345678901234</CdIntervenant>
            <NomIntervenant>Test Emetteur</NomIntervenant>
            <Contact>
                <NomContact>Test Contact</NomContact>
                <MelContact>test@example.com</MelContact>
            </Contact>
        </Emetteur>
        <Destinataire>
            <CdIntervenant schemeAgencyID="SIRET">00000000000000</CdIntervenant>
            <NomIntervenant>Destinataire Test</NomIntervenant>
        </Destinataire>
    </Scenario>
    <OuvrageDepollution>
        <CdOuvrageDepollution>${TEST_STEU_CODE}</CdOuvrageDepollution>
        <TypeOuvrageDepollution>4</TypeOuvrageDepollution>
        <NomOuvrageDepollution>Ouvrage Test</NomOuvrageDepollution>
    </OuvrageDepollution>
    <SystemeCollecte>
        <CdSystemeCollecte>${TEST_SCL_CODE}</CdSystemeCollecte>
        <LbSystemeCollecte>Systeme Collecte Test</LbSystemeCollecte>
    </SystemeCollecte>
</FctAssain>`;

  const validXmlWithRightsAndMetierSuccess = validXmlWithRights
    .replaceAll(TEST_STEU_CODE, SANDRE_FAILED_STEU_CODE)
    .replaceAll(TEST_SCL_CODE, SANDRE_FAILED_SCL_CODE);

  const referentielSeedBase = 1000;

  const buildValidXmlWithCodes = (steuCode: string, sclCode: string): string => {
    return validXmlWithRights.replaceAll(TEST_STEU_CODE, steuCode).replaceAll(TEST_SCL_CODE, sclCode);
  };

  const uploadXmlDepot = async (xmlContent: string, filename: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/depot/upload')
      .set('Cookie', ['access_token=test-token'])
      .attach('file', Buffer.from(xmlContent), {
        filename,
        contentType: 'application/xml',
      })
      .expect(201);

    return (response.body as { id: string }).id;
  };

  const enqueueJob = async <TData extends object>(name: QueueName, data: TData): Promise<string | null> => {
    const queueService = app.get<Queue>(QueueGateway);
    return await queueService.send(name, data);
  };

  const createTestDepotId = (prefix: string): string => {
    return `dep_${prefix}_${Date.now()}`;
  };

  const findDepotOrFail = async (depotId: string): Promise<DepotEntity> => {
    return await dataSource.getRepository(DepotEntity).findOneOrFail({
      where: { id: depotId },
    });
  };

  beforeAll(async () => {
    await startPostgresContainer({ new: true });
    const connectionUri = getPostgresConnectionUri();

    // Set DATABASE_URL for PgBoss to use the testcontainer
    process.env.DATABASE_URL = connectionUri;

    s3Mock = new S3TestMock();
    sftpMock = new SftpTestMock();
    notificationMock = new NotificationGatewayTestMock();

    // Create real PgBoss instance
    pgboss = new PgBoss({
      connectionString: connectionUri,
      // Reduce polling interval for faster test execution
      monitorIntervalSeconds: 1,
      superviseIntervalSeconds: 1,
      queueCacheIntervalSeconds: 1,
    });

    pgboss.on('error', (error) => {
      console.error('PgBoss error:', error);
    });

    // Start PgBoss and create queues before building the module
    await pgboss.start();
    for (const queueName of Object.values(QueueName)) {
      await pgboss.createQueue(queueName, { retryLimit: 0 });
    }

    // Create real queue service instance
    const realQueueService = new RealQueueService(pgboss);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ...initTestContainerImports(connectionUri),
        ApiModule,
        ThrottlerConfigModule,
        WorkerModule, // Include WorkerModule to register job handlers
      ],
    })
      .overrideModule(InfraModule)
      .useModule(InfraWithRealDbMockModule)
      .overrideProvider(PGBOSS)
      .useValue(pgboss)
      .overrideProvider(QueueGateway)
      .useValue(realQueueService)
      .overrideProvider(S3)
      .useValue(s3Mock)
      .overrideProvider(Sftp)
      .useValue(sftpMock)
      .overrideProvider(NotificationGateway)
      .useValue(notificationMock)
      .overrideProvider(LoggerService)
      .useValue(loggerValueMock)
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          if (key === 'DATABASE_URL') return connectionUri;
          if (key === 'MASA_API_KEY') return 'private-token';
          return process.env[key] ?? null;
        },
        getOrThrow: (key: string) => {
          if (key === 'DATABASE_URL') return connectionUri;
          if (key === 'MASA_API_KEY') return 'private-token';
          const val = process.env[key];
          if (!val) throw new Error(`Config key ${key} missing`);
          return val;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());

    const authMiddleware = app.get(AuthenticationMiddleware);
    app.use(authMiddleware.use.bind(authMiddleware));

    await app.init();

    dataSource = moduleFixture.get(DataSource);
    sandreService = moduleFixture.get(SandreService);

    // Create referential data schemas and tables
    await createReferentielDataset(dataSource);
  }, 120000);

  beforeEach(async () => {
    // Reset mocks
    s3Mock.reset();
    sftpMock.reset();
    notificationMock.reset();
    (sandreService as ConfigurableSandreMock).defaultBehavior = 'conformant';
    (sandreService as ConfigurableSandreMock).clearValidationResults?.();

    await clearControles(dataSource);

    // Clear and reseed user data
    await clearUserWithDroits(dataSource);
    testUserId = await seedUserWithDroits(dataSource, TEST_USER);
    // await clearReferentielData(dataSource);
    // await createReferentielDataset(dataSource);
  });

  afterAll(async () => {
    // Stop PgBoss gracefully
    if (pgboss) {
      try {
        await pgboss.stop();
      } catch (e) {
        // Ignore stop errors during cleanup
      }
    }
    await app?.close();
  });

  describe('Full file processing flow with real queue', () => {
    it('should not generate or send report when process_file enqueue fails', async () => {
      const queueService = app.get<Queue>(QueueGateway);
      const originalSend = queueService.send.bind(queueService);
      const queueSpy = jest
        .spyOn(queueService, 'send')
        .mockImplementation(async (name: string, options, data?: object) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
          if (name === QueueName.process_file) {
            throw new Error('Queue send failed');
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return await originalSend(name, options, data);
        });

      try {
        const depotId = await uploadXmlDepot(validXmlWithRights, 'enqueue-error.xml');
        const expectedPath = `${depotId}_enqueue-error.xml`;

        await waitFor(
          async () => {
            const depot = await findDepotOrFail(depotId);
            return depot.error === DepotError.ENQUEUE_FAILED && depot.path === expectedPath;
          },
          {
            timeoutMs: 6000,
            pollIntervalMs: 200,
            message: 'Depot should be rejected after queue enqueue failure',
          },
        );

        const finalDepot = await findDepotOrFail(depotId);
        expect(finalDepot.error).toBe(DepotError.ENQUEUE_FAILED);
        expect(finalDepot.path).toBe(expectedPath);
        expect(s3Mock.hasFile(expectedPath)).toBe(true);
        expect(notificationMock.sendEmail).not.toHaveBeenCalled();
        const processFileJobs = await getJobsForDepot(dataSource, QueueName.process_file, depotId);
        expect(processFileJobs).toHaveLength(0);
      } finally {
        queueSpy.mockRestore();
      }
    }, 12000);

    it('should process file and verify control jobs are not dispatched because user lacks rights', async () => {
      // Valid XML content
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Scenario xmlns="http://www.sandre.eaufrance.fr/2A/2024.1">
  <Emetteur>
    <Contact>
      <NomContact>Control Test</NomContact>
    </Contact>
  </Emetteur>
</Scenario>`;

      const response = await request(app.getHttpServer())
        .post('/depot/upload')
        .set('Cookie', ['access_token=test-token'])
        .attach('file', Buffer.from(xmlContent), {
          filename: 'control-dispatch-test.xml',
          contentType: 'application/xml',
        })
        .expect(201);

      const depotId = (response.body as { id: string }).id;

      // Wait for process_file to complete
      await waitForJobCompletion(dataSource, QueueName.process_file, depotId, {
        timeoutMs: 6000,
        pollIntervalMs: 200,
      });

      const metierJobs = await getJobsForDepot(dataSource, QueueName.controle_metier, depotId);
      const sandreJobs = await getJobsForDepot(dataSource, QueueName.controle_sandre_upload, depotId);
      expect(metierJobs.length).toBe(0);
      expect(sandreJobs.length).toBe(0);

      // Check that controls were processed
      const finalDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depotId },
      });
      expect(finalDepot.error).toEqual(DepotError.DROITS_INSUFFISANTS);
    }, 12000);

    it('should process file and verify control jobs are dispatched', async () => {
      // Seed VSteuSclItv to authorize the user's SIRET for the STEU and SCL codes in the XML
      await seedVSteuSclItv(dataSource, TEST_STEU_CODE, TEST_SCL_CODE, TEST_USER.itvRfa);

      const response = await request(app.getHttpServer())
        .post('/depot/upload')
        .set('Cookie', ['access_token=test-token'])
        .attach('file', Buffer.from(validXmlWithRights), {
          filename: 'control-dispatch-test.xml',
          contentType: 'application/xml',
        })
        .expect(201);

      const depotId = (response.body as { id: string }).id;

      // Wait for process_file to complete
      await waitForJobCompletion(dataSource, QueueName.process_file, depotId, {
        timeoutMs: 6000,
        pollIntervalMs: 200,
      });

      // Check that control jobs were created in the pgboss.job table
      // FileProcessor dispatches to controle_metier and controle_sandre_upload queues
      const controlJobs = await dataSource.query(
        `SELECT name, data, state FROM pgboss.job 
         WHERE (name = $1 OR name = $2) AND data->>'depotId' = $3`,
        [QueueName.controle_metier, QueueName.controle_sandre_upload, depotId],
      );

      // Control jobs should exist when rights check passes
      expect(controlJobs.length).toBeGreaterThan(0);

      // Wait for mandatory control jobs to complete
      const [metierResult, sandreUploadResult] = await Promise.all([
        waitForJobCompletion(dataSource, QueueName.controle_metier, depotId, {
          timeoutMs: 10000,
          pollIntervalMs: 200,
        }),
        waitForJobCompletion(dataSource, QueueName.controle_sandre_upload, depotId, {
          timeoutMs: 10000,
          pollIntervalMs: 200,
        }),
      ]);

      // Wait for poll job only if it has been dispatched
      let sandrePollResult: { status: string } = { status: 'timeout' };
      const sandrePollJobs = await getJobsForDepot(dataSource, QueueName.controle_sandre_poll, depotId);
      if (sandrePollJobs.length > 0) {
        sandrePollResult = await waitForJobCompletion(dataSource, QueueName.controle_sandre_poll, depotId, {
          timeoutMs: 10000,
          pollIntervalMs: 200,
        });
      }

      // Check that controls were processed
      const finalDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depotId },
      });

      // After controls complete, depot should have control statuses set
      const sandreCompleted = sandreUploadResult.status !== 'timeout' || sandrePollResult.status !== 'timeout';
      if (metierResult.status !== 'timeout' && sandreCompleted) {
        expect(finalDepot.controleStatus).toContain(ControleStatus.FAILED);
        expect(finalDepot.controleSandreStatus).toContain(ControleSandreStatus.SUCCESS);
      }
      expect(finalDepot.error).not.toEqual(DepotError.DROITS_INSUFFISANTS);

      const controles = await dataSource.getRepository(ControleEntity).find({
        where: { depotId: depotId },
      });

      // Controles should have been created (dispatched and processed)
      expect(controles.length).toBeGreaterThan(0);

      // Some V1 controles should fail because referentiel data is not seeded
      // (e.g. CTL002 for STEU, CTL022 for SCL, CTL024 for type ouvrage)
      const failedControles = controles.filter((c) => c.success === false);
      expect(failedControles.length).toBeGreaterThan(0);

      // No technical error should occur since the system processes controles correctly
      const technicalErrors = controles.filter((c) => c.error === ErrorCode.E2_999);
      expect(technicalErrors.length).toBe(0);
    }, 12000);

    it('should generate and send rapport when controle v1 and v2 pass but sandre fails', async () => {
      await seedVSteuSclItv(dataSource, SANDRE_FAILED_STEU_CODE, SANDRE_FAILED_SCL_CODE, TEST_USER.itvRfa);
      await seedSteu(dataSource, 101, SANDRE_FAILED_STEU_CODE, { steuEncoursAn: 2024 });
      await seedScl(dataSource, 101, SANDRE_FAILED_SCL_CODE, 'Systeme Collecte Test');
      await seedTlref(dataSource, 101, 'LREF_01', '4', 'Type ouvrage test');

      (sandreService as ConfigurableSandreMock).defaultBehavior = 'non-conformant';

      const response = await request(app.getHttpServer())
        .post('/depot/upload')
        .set('Cookie', ['access_token=test-token'])
        .attach('file', Buffer.from(validXmlWithRightsAndMetierSuccess), {
          filename: 'sandre-failed-rapport.xml',
          contentType: 'application/xml',
        })
        .expect(201);

      const depotId = (response.body as { id: string }).id;

      await waitForJobCompletion(dataSource, QueueName.process_file, depotId, {
        timeoutMs: 6000,
        pollIntervalMs: 200,
      });

      const [metierResult, sandreUploadResult, sandrePollResult] = await Promise.all([
        waitForJobCompletion(dataSource, QueueName.controle_metier, depotId, {
          timeoutMs: 10000,
          pollIntervalMs: 200,
        }),
        waitForJobCompletion(dataSource, QueueName.controle_sandre_upload, depotId, {
          timeoutMs: 10000,
          pollIntervalMs: 200,
        }),
        waitForJobCompletion(dataSource, QueueName.controle_sandre_poll, depotId, {
          timeoutMs: 10000,
          pollIntervalMs: 200,
        }),
      ]);

      expect(metierResult.status).toBe('completed');
      expect(sandreUploadResult.status).toBe('completed');
      expect(sandrePollResult.status).toBe('completed');

      const diffusionRapportResult = await waitForJobCompletion(dataSource, QueueName.diffusion_rapport, depotId, {
        timeoutMs: 10000,
        pollIntervalMs: 200,
      });

      expect(diffusionRapportResult.status).toBe('completed');

      const sftpJobs = await getJobsForDepot(dataSource, QueueName.send_to_sftp, depotId);
      expect(sftpJobs).toHaveLength(0);

      const controles = await dataSource.getRepository(ControleEntity).find({
        where: { depotId },
      });

      expect(controles.length).toBeGreaterThan(0);
      expect(
        controles
          .filter((controle) => !controle.success)
          .map((controle) => [controle.name, controle.error, controle.evenementType]),
      ).toEqual([]);

      const finalDepot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: depotId },
      });

      expect(finalDepot.status).toBe(DepotStatus.REJETE);
      expect(finalDepot.step).toBe(DepotStep.SEND_EMAIL_TO_DEPOSANT);
      expect(finalDepot.controleStatus).toBe(ControleStatus.SUCCESS);
      expect(finalDepot.controleSandreStatus).toBe(ControleSandreStatus.FAILED);
      expect(finalDepot.error).not.toEqual(DepotError.DROITS_INSUFFISANTS);
      expect(finalDepot.rapportPath).toBe(`rapports/${depotId}/rapport.pdf`);

      expect(controles.every((controle) => controle.success)).toBe(true);

      const pdfUpload = s3Mock.uploads.find((upload) => upload.key === finalDepot.rapportPath);
      expect(pdfUpload).toBeDefined();
      expect(pdfUpload?.contentType).toBe('application/pdf');
      expect(finalDepot.rapportPath ? s3Mock.hasFile(finalDepot.rapportPath) : false).toBe(true);

      expect(notificationMock.sendEmail).toHaveBeenCalledTimes(1);
      expect(notificationMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Rapport de rejet du dépôt',
          depotId,
          nomOriginalFichier: 'sandre-failed-rapport.xml',
          prenom: TEST_USER.prenom,
          nom: TEST_USER.nom,
          to: [{ email: TEST_USER.email, name: `${TEST_USER.prenom} ${TEST_USER.nom}` }],
          attachments: [
            expect.objectContaining({
              fileName: `rapport-${depotId}.pdf`,
            }),
          ],
        }),
        2,
      );
    }, 15000);

    it('should generate and send rapport when MASA refuses a depot after successful controls', async () => {
      const depotId = createTestDepotId('masa_refuse');
      const depotPath = `${depotId}_masa-refuse.xml`;

      await seedDepotFull(dataSource, {
        id: depotId,
        nomOriginalFichier: 'masa-refuse.xml',
        tailleFichier: validXmlWithRights.length,
        type: 'application/xml',
        path: depotPath,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.SFTP_COMPLETED,
        userId: testUserId,
      });
      s3Mock.seed(depotPath, validXmlWithRights);

      const masaService = app.get(MasaService);
      await masaService.processRetourAgentVerseau({
        versau2DepotId: depotId,
        numeroDepotVerseau1: 'V1-REFUSE-123',
        statut: MasaStatus.REFUSE,
        rapport: 'Depot refuse par MASA',
      });

      const processAfterMasaResult = await waitForJobCompletion(
        dataSource,
        QueueName.process_after_masa_webhook,
        depotId,
        {
          timeoutMs: 10000,
          pollIntervalMs: 200,
        },
      );
      expect(processAfterMasaResult.status).toBe('completed');

      const diffusionRapportResult = await waitForJobCompletion(dataSource, QueueName.diffusion_rapport, depotId, {
        timeoutMs: 10000,
        pollIntervalMs: 200,
      });
      expect(diffusionRapportResult.status).toBe('completed');

      const finalDepot = await findDepotOrFail(depotId);
      expect(finalDepot.status).toBe(DepotStatus.REJETE);
      expect(finalDepot.step).toBe(DepotStep.SEND_EMAIL_TO_DEPOSANT);
      expect(finalDepot.rapportPath).toBe(`rapports/${depotId}/rapport.pdf`);

      const pdfUpload = s3Mock.uploads.find((upload) => upload.key === finalDepot.rapportPath);
      expect(pdfUpload).toBeDefined();
      expect(pdfUpload?.contentType).toBe('application/pdf');
      expect(finalDepot.rapportPath ? s3Mock.hasFile(finalDepot.rapportPath) : false).toBe(true);

      expect(notificationMock.sendEmail).toHaveBeenCalledTimes(1);
      expect(notificationMock.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Rapport du dépôt V1-REFUSE-123',
          depotId,
          nomOriginalFichier: 'masa-refuse.xml',
          statut: MasaStatus.REFUSE,
          numeroDepotVerseau1: 'V1-REFUSE-123',
          prenom: TEST_USER.prenom,
          nom: TEST_USER.nom,
          to: [{ email: TEST_USER.email, name: `${TEST_USER.prenom} ${TEST_USER.nom}` }],
          attachments: [
            expect.objectContaining({
              fileName: `rapport-${depotId}.pdf`,
            }),
          ],
        }),
        2,
      );
    }, 20000);

    it('should not enqueue diffusion_rapport when fileProcessor has a technical error', async () => {
      const fileProcessorService = app.get(FileProcessorService);
      const spy = jest
        .spyOn(fileProcessorService, 'process')
        .mockRejectedValue(new Error('Technical error in fileProcessor'));

      const depotId = createTestDepotId('process_file_error');
      const jobId = await enqueueJob(QueueName.process_file, {
        depotId,
        filePath: 'tech-error.xml',
        utilisateur: { id: testUserId, nom: TEST_USER.nom, prenom: TEST_USER.prenom },
      });

      const processFileResult = await waitForJobCompletion(dataSource, QueueName.process_file, depotId, {
        timeoutMs: 6000,
        pollIntervalMs: 200,
      });

      expect(jobId).toBeTruthy();
      expect(processFileResult.status).toBe('failed');
      const diffusionRapportJobs = await getJobsForDepot(dataSource, QueueName.diffusion_rapport, depotId);
      expect(diffusionRapportJobs).toHaveLength(0);
      spy.mockRestore();
    }, 15000);

    it('should not enqueue diffusion_rapport when controleMetier has a technical error', async () => {
      const controleMetierService = app.get(ControleMetierProcessorService);
      const spy = jest
        .spyOn(controleMetierService, 'process')
        .mockRejectedValue(new Error('Technical error in controleMetier'));

      const depotId = createTestDepotId('controle_metier_error');
      const jobId = await enqueueJob(QueueName.controle_metier, {
        depotId,
        filePath: 'tech-error-metier.xml',
      });

      const controleMetierResult = await waitForJobCompletion(dataSource, QueueName.controle_metier, depotId, {
        timeoutMs: 6000,
        pollIntervalMs: 200,
      });

      expect(jobId).toBeTruthy();
      expect(controleMetierResult.status).toBe('failed');
      const diffusionRapportJobs = await getJobsForDepot(dataSource, QueueName.diffusion_rapport, depotId);
      expect(diffusionRapportJobs).toHaveLength(0);
      spy.mockRestore();
    }, 15000);

    it('should not enqueue diffusion_rapport when sandre polling has a technical error', async () => {
      const sandrePollService = app.get(ControleSandrePollProcessorService);
      const spy = jest
        .spyOn(sandrePollService, 'process')
        .mockRejectedValue(new Error('Technical error in sandrePoll'));

      const depotId = createTestDepotId('sandre_poll_error');
      const jobId = await enqueueJob(QueueName.controle_sandre_poll, {
        depotId,
        jeton: 'mock-jeton',
        attemptCount: 0,
      });

      const sandrePollResult = await waitForJobCompletion(dataSource, QueueName.controle_sandre_poll, depotId, {
        timeoutMs: 6000,
        pollIntervalMs: 200,
      });

      expect(jobId).toBeTruthy();
      expect(sandrePollResult.status).toBe('failed');
      const diffusionRapportJobs = await getJobsForDepot(dataSource, QueueName.diffusion_rapport, depotId);
      expect(diffusionRapportJobs).toHaveLength(0);
      spy.mockRestore();
    }, 15000);
  });
});
