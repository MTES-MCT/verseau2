import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.join(__dirname, '../../test.envfile'),
  override: true,
});

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { DepotStep, DepotStatus, initializeDepotUpload, type RouteResponse } from '@lib/dossier';
import { DepotUploadService } from '@dossier/depot/depotUpload.service';
import { QueueName, QueueGateway } from '@infra/queue/queue';
import { S3 } from '@infra/s3/s3';
import { MAX_DEPOT_FILE_SIZE_BYTES } from '@shared/constants/mimeTypes';
import { AgentVerseauClient } from '@infra/agentVerseauClient/agentVerseauClient';
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
  TransferClientTestMock,
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
      .overrideProvider(AgentVerseauClient)
      .useClass(TransferClientTestMock)
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
      uid: 'cerbere-test-user',
      mel: 'dev@example.com',
      itvCdn: 100,
      isExpertNational: false,
    });

    // Seed user
    const userRepository = dataSource.getRepository(UserEntity);
    await userRepository.save({
      id: 'user_123',
      sub: 'test-user-id',
      uid: 'cerbere-test-user',
      email: 'dev@example.com',
      nom: 'Test',
      prenom: 'User',
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  const initialize = async (fileName = 'sample.xml', size = 13) => {
    const response = await request(app.getHttpServer())
      .post('/depot/upload/init')
      .set('Cookie', ['access_token=test-token'])
      .send({ fileName, size, contentType: 'application/xml' })
      .expect(201);
    return response.body as RouteResponse<typeof initializeDepotUpload>;
  };

  const complete = (id: string) =>
    request(app.getHttpServer()).post(`/depot/${id}/upload/complete`).set('Cookie', ['access_token=test-token']);

  const findDepot = (id: string) => dataSource.getRepository(DepotEntity).findOneByOrFail({ id });
  const seedUpload = (session: RouteResponse<typeof initializeDepotUpload>, content = '<root></root>') => {
    s3Mock.seed(decodeURIComponent(new URL(session.uploadUrl).pathname.slice(1)), content);
  };

  it('initializes without buffering or processing, then confirms exactly once', async () => {
    const createUploadUrl = jest.spyOn(s3Mock, 'createUploadUrl');
    const session = await initialize();
    expect(createUploadUrl).toHaveBeenCalledWith(`uploads/${session.depotId}/file.xml`, 900, 13);
    expect(s3Mock.uploads).toHaveLength(0);
    expect(queueMock.getJobsByName(QueueName.process_file)).toHaveLength(0);
    expect(queueMock.getJobsByName(QueueName.cleanup_depot_upload)).toHaveLength(1);
    expect((await findDepot(session.depotId)).step).toBe(DepotStep.UPLOADING_TO_S3);
    seedUpload(session);
    await Promise.all([complete(session.depotId).expect(201), complete(session.depotId).expect(201)]);
    await complete(session.depotId).expect(201);
    const depot = await findDepot(session.depotId);
    expect(depot.path).toBe(`depots/${depot.id}/file.xml`);
    expect(depot.stepHistory).toEqual([DepotStep.UPLOADING_TO_S3, DepotStep.PENDING]);
    expect(s3Mock.getFile(depot.path!)).toEqual(Buffer.from('<root></root>'));
    expect(queueMock.getJobsByName(QueueName.process_file)).toEqual([
      {
        name: QueueName.process_file,
        data: { depotId: depot.id, filePath: depot.path, utilisateur: { id: 'user_123', nom: 'Test', prenom: 'User' } },
      },
    ]);
    // Reusing the signed URL cannot alter the frozen file processed by the worker.
    seedUpload(session, '<changed/>');
    expect(s3Mock.getFile(depot.path!)).toEqual(Buffer.from('<root></root>'));
    await dataSource.getRepository(DepotEntity).update(depot.id, { step: DepotStep.CONTROLE_COMPLETED });
    await complete(depot.id).expect(201);
    expect((await findDepot(depot.id)).step).toBe(DepotStep.CONTROLE_COMPLETED);
  });

  it('rejects non-XML uploads', async () => {
    await request(app.getHttpServer())
      .post('/depot/upload/init')
      .set('Cookie', ['access_token=test-token'])
      .send({ fileName: 'sample.txt', size: 10, contentType: 'text/plain' })
      .expect(400);

    expect(s3Mock.uploads).toHaveLength(0);
    expect(queueMock.jobs).toHaveLength(0);
  });

  it.each([0, -1, 0.5, MAX_DEPOT_FILE_SIZE_BYTES + 1])(
    'rejects invalid size %s without receiving a file',
    async (size) => {
      await request(app.getHttpServer())
        .post('/depot/upload/init')
        .set('Cookie', ['access_token=test-token'])
        .send({ fileName: 'sample.xml', size, contentType: 'application/xml' })
        .expect(400);

      expect(s3Mock.uploads).toHaveLength(0);
      expect(queueMock.jobs).toHaveLength(0);
    },
  );

  it('uploads a file with accents in the name and preserves encoding', async () => {
    const filenameWithAccents = 'panissières.xml';
    const session = await initialize(filenameWithAccents);
    seedUpload(session);
    await complete(session.depotId).expect(201);
    const depot = await findDepot(session.depotId);
    expect(depot.nomOriginalFichier).toBe(filenameWithAccents);
    expect(new URL(session.uploadUrl).pathname).toBe(`/uploads/${depot.id}/file.xml`);
    expect(depot.path).toBe(`depots/${depot.id}/file.xml`);
  });

  it('rejects confirmation before upload and allows retry once it exists', async () => {
    const session = await initialize();
    await complete(session.depotId).expect(409);
    expect(queueMock.getJobsByName(QueueName.process_file)).toHaveLength(0);
    seedUpload(session);
    await complete(session.depotId).expect(201);
  });

  it('rejects mismatched actual size and content type', async () => {
    const session = await initialize();
    seedUpload(session, '<different/>');
    await complete(session.depotId).expect(400);
    seedUpload(session);
    jest.spyOn(s3Mock, 'head').mockResolvedValue({ size: 13, contentType: 'text/plain', etag: 'etag' });
    await complete(session.depotId).expect(400);
    expect(queueMock.getJobsByName(QueueName.process_file)).toHaveLength(0);
  });

  it('only lets the initializing user confirm the depot', async () => {
    const session = await initialize();
    seedUpload(session);
    await dataSource.getRepository(UserEntity).save({
      id: 'user_other',
      sub: 'other-user',
      uid: 'cerbere-other-user',
      email: 'other@example.com',
      nom: 'Other',
      prenom: 'User',
    });
    await dataSource.getRepository(DepotEntity).update(session.depotId, { userId: 'user_other' });
    await complete(session.depotId).expect(403);
    expect(queueMock.getJobsByName(QueueName.process_file)).toHaveLength(0);
  });

  it('rolls back confirmation on queue failure and can retry', async () => {
    const session = await initialize();
    seedUpload(session);
    queueMock.setFailure(true);
    await complete(session.depotId).expect(500);
    expect((await findDepot(session.depotId)).path).toBeNull();
    queueMock.setFailure(false);
    await complete(session.depotId).expect(201);
    expect(queueMock.getJobsByName(QueueName.process_file)).toHaveLength(1);
  });

  it('rejects confirmation and skips cleanup for a depot without a direct upload session', async () => {
    const repository = dataSource.getRepository(DepotEntity);
    const depot = await repository.save(
      repository.create({
        nomOriginalFichier: 'sample.xml',
        tailleFichier: 13,
        type: 'application/xml',
        userId: 'user_123',
        path: 'depots/other/file.xml',
        step: DepotStep.PENDING,
      }),
    );
    s3Mock.seed(depot.path!, '<root></root>');

    await complete(depot.id).expect(409);
    await app.get(DepotUploadService).cleanup(depot.id);

    expect(s3Mock.hasFile(depot.path!)).toBe(true);
    expect((await findDepot(depot.id)).status).toBe(DepotStatus.EN_COURS_DE_TRAITEMENT);
    expect(queueMock.jobs).toHaveLength(0);
  });

  it('cleans the final object left by a rolled-back confirmation', async () => {
    const session = await initialize();
    seedUpload(session);
    queueMock.setFailure(true);
    await complete(session.depotId).expect(500);
    const depot = await findDepot(session.depotId);
    const filePath = `depots/${depot.id}/file.xml`;
    expect(depot.path).toBeNull();
    expect(s3Mock.hasFile(filePath)).toBe(true);

    await dataSource.getRepository(DepotEntity).update(depot.id, { uploadExpiresAt: new Date(Date.now() - 7200000) });
    await app.get(DepotUploadService).cleanup(depot.id);

    expect(s3Mock.hasFile(filePath)).toBe(false);
    expect(s3Mock.hasFile(`uploads/${depot.id}/file.xml`)).toBe(false);
    expect((await findDepot(depot.id)).status).toBe(DepotStatus.REJETE);
  });

  it('expires abandoned uploads and cleans their objects', async () => {
    const session = await initialize();
    seedUpload(session);
    await dataSource
      .getRepository(DepotEntity)
      .update(session.depotId, { uploadExpiresAt: new Date(Date.now() - 7200000) });
    await complete(session.depotId).expect(410);
    await app.get(DepotUploadService).cleanup(session.depotId);
    const depot = await findDepot(session.depotId);
    expect(depot.status).toBe(DepotStatus.REJETE);
    expect(s3Mock.hasFile(`uploads/${depot.id}/file.xml`)).toBe(false);
  });

  it('cleans staging but retains a confirmed file', async () => {
    const session = await initialize();
    seedUpload(session);
    await complete(session.depotId).expect(201);
    await dataSource
      .getRepository(DepotEntity)
      .update(session.depotId, { uploadExpiresAt: new Date(Date.now() - 7200000) });
    await app.get(DepotUploadService).cleanup(session.depotId);
    const depot = await findDepot(session.depotId);
    expect(s3Mock.hasFile(`uploads/${depot.id}/file.xml`)).toBe(false);
    expect(s3Mock.hasFile(depot.path!)).toBe(true);
    await complete(session.depotId).expect(201);
  });
});
