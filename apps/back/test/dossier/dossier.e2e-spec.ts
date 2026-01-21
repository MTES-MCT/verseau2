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

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';

import { DepotEntity } from '@dossier/depot/depot.entity';
import { DepotStatus } from '@lib/dossier';
import { S3 } from '@infra/s3/s3';
import { Sftp } from '@infra/sftp/sftp';
import { QueueGateway, PGBOSS, QueueName } from '@infra/queue/queue';
import { ApiModule } from '../../src/api/api.module';
import { InfraModule } from '@infra/infra.module';
import { InfraWithRealDbMockModule } from '../mock/infraWithRealDbMock.module';
import { AuthenticationMiddleware } from '@authentication/authentication.middleware';
import { LoggerService } from '@shared/logger/logger.service';
import { loggerValueMock } from '@shared/logger/logger.mock';
import { ThrottlerConfigModule } from '@infra/throttler/throttler.module';

import { startPostgresContainer, getPostgresConnectionUri } from '../testcontainer.config';
import { initTestContainerImports } from '../init/initTestContainer';
import { createReferentielDataset } from '../createReferentielDataset';
import { seedUserWithDroits, seedUserWithoutDroits, clearUserWithDroits } from '../userWithDroitsDataset.helper';

// Import shared mocks
import { S3TestMock, SftpTestMock, QueueTestMock } from '../mock/shared-mocks';

// ============= Test Suite =============

describe('Dossier E2E - Depot Upload', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let s3Mock: S3TestMock;
  let sftpMock: SftpTestMock;
  let queueMock: QueueTestMock;

  // Test user data matching AuthenticationMockService.getMockUser()
  const TEST_USER = {
    sub: 'test-user-id',
    email: 'dev@example.com',
    nom: 'Test',
    prenom: 'User',
    itvCdn: 100,
  };

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();

    s3Mock = new S3TestMock();
    sftpMock = new SftpTestMock();
    queueMock = new QueueTestMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), ApiModule, ThrottlerConfigModule],
    })
      .overrideModule(InfraModule)
      .useModule(InfraWithRealDbMockModule)
      .overrideProvider(PGBOSS)
      .useValue(null)
      .overrideProvider(QueueGateway)
      .useValue(queueMock)
      .overrideProvider(S3)
      .useValue(s3Mock)
      .overrideProvider(Sftp)
      .useValue(sftpMock)
      .overrideProvider(LoggerService)
      .useValue(loggerValueMock)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());

    const authMiddleware = app.get(AuthenticationMiddleware);
    app.use(authMiddleware.use.bind(authMiddleware));

    await app.init();

    dataSource = moduleFixture.get(DataSource);

    // Create referential data schemas and tables
    await createReferentielDataset(dataSource);
  }, 60000);

  beforeEach(async () => {
    // Reset mocks
    s3Mock.reset();
    sftpMock.reset();
    queueMock.reset();

    // Clear and reseed user data
    await clearUserWithDroits(dataSource);
    await seedUserWithDroits(dataSource, TEST_USER);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('POST /depot/upload', () => {
    it('should upload an XML file and enqueue processing', async () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<SA_Assainissement xmlns="http://xml.sandre.eaufrance.fr/scenario/assainissement/2">
  <FctAssainissement>
    <CdOuvrageDepollution>0100001S0001</CdOuvrageDepollution>
  </FctAssainissement>
</SA_Assainissement>`;

      const response = await request(app.getHttpServer())
        .post('/depot/upload')
        .set('Cookie', ['access_token=test-token'])
        .attach('file', Buffer.from(xmlContent), { filename: 'test-upload.xml', contentType: 'application/xml' })
        .expect(201);

      const responseBody = response.body as { id: string; nomOriginalFichier: string; type: string; itvCdn: number };

      expect(responseBody.nomOriginalFichier).toBe('test-upload.xml');
      expect(responseBody.type).toBe('application/xml');
      expect(responseBody.id).toBeDefined();
      expect(responseBody.itvCdn).toBe(TEST_USER.itvCdn);

      // Wait for async S3 upload and queue job to complete
      await queueMock.waitForJob();

      // Verify S3 upload was called
      expect(s3Mock.uploads).toHaveLength(1);
      expect(s3Mock.uploads[0].key).toContain('test-upload.xml');

      // Verify queue job was sent
      const processFileJobs = queueMock.getJobsByName(QueueName.process_file);
      expect(processFileJobs).toHaveLength(1);
      expect(processFileJobs[0].data).toMatchObject({
        depotId: responseBody.id,
        filePath: expect.stringContaining('test-upload.xml') as string,
        utilisateur: {
          nom: TEST_USER.nom,
          prenom: TEST_USER.prenom,
        },
      });

      // Verify depot entity was created in database
      const depot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: responseBody.id },
      });

      expect(depot.nomOriginalFichier).toBe('test-upload.xml');
      expect(depot.status).toBe(DepotStatus.EN_COURS_DE_TRAITEMENT);
      // itvCdn may be returned as string from DB, compare as string
      expect(String(depot.itvCdn)).toBe(String(TEST_USER.itvCdn));
      expect(depot.path).toContain('test-upload.xml');
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/depot/upload')
        .set('Cookie', ['access_token=test-token'])
        .expect(400);

      expect((response.body as { message: string }).message).toBe('No file provided');

      // No S3 upload should have happened
      expect(s3Mock.uploads).toHaveLength(0);
    });

    it('should return 400 when file is not XML', async () => {
      const response = await request(app.getHttpServer())
        .post('/depot/upload')
        .set('Cookie', ['access_token=test-token'])
        .attach('file', Buffer.from('plain text content'), { filename: 'test.txt', contentType: 'text/plain' })
        .expect(400);

      expect((response.body as { message: string }).message).toBe('File must be an XML file');

      // No S3 upload should have happened
      expect(s3Mock.uploads).toHaveLength(0);
    });

    it('should return 403 when user has no ITV linked', async () => {
      // Clear and seed user without droits
      await clearUserWithDroits(dataSource);
      await seedUserWithoutDroits(dataSource, {
        sub: TEST_USER.sub,
        email: TEST_USER.email,
        nom: TEST_USER.nom,
        prenom: TEST_USER.prenom,
      });

      const xmlContent = '<root></root>';

      const response = await request(app.getHttpServer())
        .post('/depot/upload')
        .set('Cookie', ['access_token=test-token'])
        .attach('file', Buffer.from(xmlContent), { filename: 'test.xml', contentType: 'application/xml' })
        .expect(403);

      expect((response.body as { message: string }).message).toBe('Aucun intervenant (ITV) lié à votre compte');
    });

    it('should preserve accented characters in filename', async () => {
      const xmlContent = '<root></root>';
      const filenameWithAccents = 'données_été_été.xml';

      const response = await request(app.getHttpServer())
        .post('/depot/upload')
        .set('Cookie', ['access_token=test-token'])
        .attach('file', Buffer.from(xmlContent), { filename: filenameWithAccents, contentType: 'application/xml' })
        .expect(201);

      const responseBody = response.body as { id: string; nomOriginalFichier: string };

      expect(responseBody.nomOriginalFichier).toBe(filenameWithAccents);

      // Verify in database
      const depot = await dataSource.getRepository(DepotEntity).findOneOrFail({
        where: { id: responseBody.id },
      });

      expect(depot.nomOriginalFichier).toBe(filenameWithAccents);
    });

    it('should return 401 when no access token is provided', async () => {
      const xmlContent = '<root></root>';

      await request(app.getHttpServer())
        .post('/depot/upload')
        .attach('file', Buffer.from(xmlContent), { filename: 'test.xml', contentType: 'application/xml' })
        .expect(401);
    });
  });

  describe('GET /depot', () => {
    it('should return list of depots for the authenticated user', async () => {
      // First upload a file
      const xmlContent = '<root></root>';
      const uploadResponse = await request(app.getHttpServer())
        .post('/depot/upload')
        .set('Cookie', ['access_token=test-token'])
        .attach('file', Buffer.from(xmlContent), { filename: 'list-test.xml', contentType: 'application/xml' })
        .expect(201);

      // Wait for async S3 upload and queue job
      await queueMock.waitForJob();

      // List depots
      const listResponse = await request(app.getHttpServer())
        .get('/depot')
        .set('Cookie', ['access_token=test-token'])
        .expect(200);

      const depots = listResponse.body as Array<{ id: string; nomOriginalFichier: string }>;

      expect(depots).toBeInstanceOf(Array);
      expect(depots.length).toBeGreaterThanOrEqual(1);

      const uploadedDepot = depots.find((d) => d.id === (uploadResponse.body as { id: string }).id);
      expect(uploadedDepot).toBeDefined();
      expect(uploadedDepot?.nomOriginalFichier).toBe('list-test.xml');
    });

    it('should return empty list when user has no ITV', async () => {
      // Clear and seed user without droits
      await clearUserWithDroits(dataSource);
      await seedUserWithoutDroits(dataSource, {
        sub: TEST_USER.sub,
        email: TEST_USER.email,
      });

      const response = await request(app.getHttpServer())
        .get('/depot')
        .set('Cookie', ['access_token=test-token'])
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });
});
