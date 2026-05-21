import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { DepotStep, DepotStatus } from '@lib/dossier';
import { QueueName, QueueGateway } from '@infra/queue/queue';
import { S3 } from '@infra/s3/s3';
import { Sftp } from '@infra/sftp/sftp';
import { Authentication } from '@authentication/authentication';
import { AuthenticationMiddleware } from '@authentication/authentication.middleware';
import { UserService } from '@user/user.service';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '@user/user.entity';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { startPostgresContainer, getPostgresConnectionUri } from '../../testcontainer.config';
import cookieParser from 'cookie-parser';
import { DroitsUserService } from '@user/droitsUser.service';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { DossierModule } from '@dossier/dossier.module';
import { S3_CLIENT } from '@infra/s3/s3.service';

// Import shared mocks
import {
  S3TestMock,
  SftpTestMock,
  QueueTestMock,
  ConfigServiceTestMock,
  UserServiceTestMock,
  DroitsUserServiceTestMock,
  RoseauGatewayTestMock,
  LanceleauGatewayTestMock,
} from '../../mock/shared-mocks';

describe('Depot upload (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let s3Mock: S3TestMock;
  let queueMock: QueueTestMock;
  let configMock: ConfigServiceTestMock;
  let authentication: Authentication;

  beforeAll(async () => {
    process.env.USE_SANDRE_MOCK = 'true';
    process.env.OIDC_MOCK = 'true';
    process.env.S3_PROVIDER = 'mock';
    process.env.SFTP_PROVIDER = 'mock';

    await startPostgresContainer();

    s3Mock = new S3TestMock();
    queueMock = new QueueTestMock();
    configMock = new ConfigServiceTestMock({
      DATABASE_URL: getPostgresConnectionUri(),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DossierModule],
    })
      .overrideProvider(ConfigService)
      .useValue(configMock)
      .overrideProvider(QueueGateway)
      .useValue(queueMock)
      .overrideProvider(S3_CLIENT)
      .useValue({})
      .overrideProvider(S3)
      .useValue(s3Mock)
      .overrideProvider(Sftp)
      .useClass(SftpTestMock)
      .overrideProvider(UserService)
      .useClass(UserServiceTestMock)
      .overrideProvider(DroitsUserService)
      .useClass(DroitsUserServiceTestMock)
      .overrideProvider(RoseauGateway)
      .useClass(RoseauGatewayTestMock)
      .overrideProvider(LanceleauGateway)
      .useClass(LanceleauGatewayTestMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    const authMiddleware = app.get(AuthenticationMiddleware);
    app.use(authMiddleware.use.bind(authMiddleware));

    await app.init();

    dataSource = moduleFixture.get(DataSource);
    authentication = moduleFixture.get(Authentication);
  });

  beforeEach(async () => {
    jest.restoreAllMocks();

    // Reset mocks
    s3Mock.reset();
    queueMock.reset();

    jest.spyOn(authentication, 'validateToken').mockResolvedValue({
      cerbereId: 'test-user-id',
      mel: 'dev@example.com',
      itvCdn: 100,
      isExpertNational: false,
    });

    // Seed user
    const userRepository = dataSource.getRepository(UserEntity);
    await userRepository.save({
      id: 'user_123',
      sub: 'test-user-id',
      email: 'dev@example.com',
      nom: 'Test',
      prenom: 'User',
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('uploads an XML file and enqueues processing', async () => {
    const xmlContent = '<root></root>';

    const response = await request(app.getHttpServer())
      .post('/depot/upload')
      .set('Cookie', ['access_token=test-token'])
      .attach('file', Buffer.from(xmlContent), { filename: 'sample.xml', contentType: 'application/xml' })
      .expect(201);

    const responseBody = response.body as { id: string; nomOriginalFichier: string; type: string };

    expect(responseBody.nomOriginalFichier).toBe('sample.xml');
    expect(responseBody.type).toBe('application/xml');

    // Wait for the async uploadAndEnqueue chain to complete
    await queueMock.waitForJob();

    const depot = await dataSource.getRepository(DepotEntity).findOneOrFail({
      where: { id: responseBody.id },
    });

    const expectedPath = `${depot.id}_${responseBody.nomOriginalFichier}`;
    expect(depot.path).toBe(expectedPath);
    expect(depot.status).toBe(DepotStatus.EN_COURS_DE_TRAITEMENT);
    expect(depot.step).toBe(DepotStep.PENDING);

    expect(s3Mock.uploads).toHaveLength(1);
    expect((s3Mock.uploads[0] as { key: string }).key).toBe(expectedPath);

    expect(queueMock.jobs).toHaveLength(1);
    expect(queueMock.jobs[0]).toMatchObject({
      name: QueueName.process_file,
      data: {
        depotId: depot.id,
        filePath: expectedPath,
        utilisateur: { nom: 'Test', prenom: 'User' },
      },
    });
  });

  it('rejects non-XML uploads', async () => {
    await request(app.getHttpServer())
      .post('/depot/upload')
      .set('Cookie', ['access_token=test-token'])
      .attach('file', Buffer.from('plain text'), { filename: 'sample.txt', contentType: 'text/plain' })
      .expect(400);

    expect(s3Mock.uploads).toHaveLength(0);
    expect(queueMock.jobs).toHaveLength(0);
  });

  it('uploads a file with accents in the name and preserves encoding', async () => {
    const xmlContent = '<root></root>';
    const filenameWithAccents = 'panissières.xml';

    const response = await request(app.getHttpServer())
      .post('/depot/upload')
      .set('Cookie', ['access_token=test-token'])
      .attach('file', Buffer.from(xmlContent), { filename: filenameWithAccents, contentType: 'application/xml' })
      .expect(201);

    const responseBody = response.body as { id: string; nomOriginalFichier: string; type: string };

    expect(responseBody.nomOriginalFichier).toBe(filenameWithAccents);

    const depot = await dataSource.getRepository(DepotEntity).findOneOrFail({
      where: { id: responseBody.id },
    });

    expect(depot.nomOriginalFichier).toBe(filenameWithAccents);
  });
});
