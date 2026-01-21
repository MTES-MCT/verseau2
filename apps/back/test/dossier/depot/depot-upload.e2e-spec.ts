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

class ConfigServiceMock {
  get(key: string) {
    if (key === 'DATABASE_URL') return getPostgresConnectionUri();
    if (key === 'DDL_SYNC') return 'true';
    if (key === 'FAKE_TOKEN_STORAGE_KEY') return 'test-token';
    if (key === 'S3_PROVIDER') return 'mock';
    if (key === 'SFTP_PROVIDER') return 'mock';
    if (key === 'S3_BUCKET') return 'test-bucket';
    if (key === 'S3_ENDPOINT') return 'http://localhost:9000';
    if (key === 'S3_REGION') return 'us-east-1';
    if (key === 'S3_ACCESS_KEY') return 'minio';
    if (key === 'S3_SECRET_KEY') return 'minio123';
    if (key === 'SFTP_HOST') return 'localhost';
    if (key === 'SFTP_PORT') return '22';
    if (key === 'SFTP_USERNAME') return 'user';
    if (key === 'SFTP_PRIVATE_KEY') return 'key';
    if (key === 'SFTP_AGENCY_CONFIG') return '{}';
    if (key === 'OIDC_MOCK') return 'true';
    if (key === 'OIDC_ISSUER_URL') return 'https://mock-issuer';
    if (key === 'OIDC_CLIENT_ID') return 'mock-client';
    if (key === 'OIDC_CLIENT_SECRET') return 'mock-secret';
    if (key === 'OIDC_REDIRECT_URI') return 'http://mock-redirect';
    return null;
  }
  getOrThrow(key: string) {
    const val = this.get(key);
    if (!val) throw new Error(`Config key ${key} missing`);
    return val;
  }
}

class S3Mock implements S3 {
  uploads: Array<{ key: string; body: Buffer | Uint8Array | string; contentType?: string }> = [];

  async upload(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void> {
    this.uploads.push({ key, body, contentType });
    await Promise.resolve();
  }

  async download(): Promise<Buffer> {
    await Promise.resolve();
    throw new Error('Not implemented in mock');
  }
}

class QueueServiceMock {
  calls: Array<{ name: string; data?: object }> = [];
  private resolver?: () => void;

  async send<TData = object>(name: string, data?: TData): Promise<string | null> {
    this.calls.push({ name, data: data as object });
    this.resolver?.();
    await Promise.resolve();
    return 'job-id';
  }

  async work(): Promise<string> {
    await Promise.resolve();
    throw new Error('Not implemented in mock');
  }

  waitForSend(): Promise<void> {
    if (this.calls.length > 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }
}

class UserServiceMock {
  async findBySub(sub: string): Promise<UserEntity> {
    await Promise.resolve();
    return {
      id: 'user_123',
      sub,
      email: 'test@example.com',
      nom: 'Test',
      prenom: 'User',
      depots: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserEntity;
  }
}

class DroitsUserServiceMock {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolveItvCdn(sub: string): Promise<number | null> {
    await Promise.resolve();
    return 100;
  }
}

class RoseauGatewayMock {
  findSteuBySandreCda() {
    return Promise.resolve(null);
  }
  findCxnAdmBySteuAndItv() {
    return Promise.resolve(null);
  }
}

class LanceleauGatewayMock {}

class SftpMock {}

describe('Depot upload (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let s3Mock: S3Mock;
  let queueMock: QueueServiceMock;

  beforeAll(async () => {
    process.env.USE_SANDRE_MOCK = 'true';
    process.env.OIDC_MOCK = 'true';
    process.env.S3_PROVIDER = 'mock';
    process.env.SFTP_PROVIDER = 'mock';

    await startPostgresContainer();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DossierModule],
    })
      .overrideProvider(ConfigService)
      .useClass(ConfigServiceMock)
      .overrideProvider(QueueGateway)
      .useClass(QueueServiceMock)
      .overrideProvider(S3_CLIENT)
      .useValue({})
      .overrideProvider(S3)
      .useClass(S3Mock)
      .overrideProvider(Sftp)
      .useClass(SftpMock)
      .overrideProvider(UserService)
      .useClass(UserServiceMock)
      .overrideProvider(DroitsUserService)
      .useClass(DroitsUserServiceMock)
      .overrideProvider(RoseauGateway)
      .useClass(RoseauGatewayMock)
      .overrideProvider(LanceleauGateway)
      .useClass(LanceleauGatewayMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    const authMiddleware = app.get(AuthenticationMiddleware);
    app.use(authMiddleware.use.bind(authMiddleware));

    await app.init();

    dataSource = moduleFixture.get(DataSource);
    s3Mock = moduleFixture.get<S3>(S3) as S3Mock;
    queueMock = moduleFixture.get<QueueServiceMock>(QueueGateway);
  });

  beforeEach(async () => {
    // Seed user
    const userRepository = dataSource.getRepository(UserEntity);
    await userRepository.save({
      id: 'user_123',
      sub: 'test-user-id',
      email: 'test@example.com',
      nom: 'Test',
      prenom: 'User',
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('uploads an XML file and enqueues processing', async () => {
    // Reset mocks
    s3Mock.uploads = [];
    queueMock.calls = [];

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
    await queueMock.waitForSend();

    const depot = await dataSource.getRepository(DepotEntity).findOneOrFail({
      where: { id: responseBody.id },
    });

    const expectedPath = `${depot.id}_${responseBody.nomOriginalFichier}`;
    expect(depot.path).toBe(expectedPath);
    expect(depot.status).toBe(DepotStatus.EN_COURS_DE_TRAITEMENT);
    expect(depot.step).toBe(DepotStep.PENDING);

    expect(s3Mock.uploads).toHaveLength(1);
    expect((s3Mock.uploads[0] as { key: string }).key).toBe(expectedPath);

    expect(queueMock.calls).toHaveLength(1);
    expect(queueMock.calls[0]).toMatchObject({
      name: QueueName.process_file,
      data: {
        depotId: depot.id,
        filePath: expectedPath,
        utilisateur: { nom: 'Test', prenom: 'User' },
      },
    });
  });

  it('rejects non-XML uploads', async () => {
    // Reset mocks
    s3Mock.uploads = [];
    queueMock.calls = [];

    await request(app.getHttpServer())
      .post('/depot/upload')
      .set('Cookie', ['access_token=test-token'])
      .attach('file', Buffer.from('plain text'), { filename: 'sample.txt', contentType: 'text/plain' })
      .expect(400);

    expect(s3Mock.uploads).toHaveLength(0);
    expect(queueMock.calls).toHaveLength(0);
  });

  it('uploads a file with accents in the name and preserves encoding', async () => {
    s3Mock.uploads = [];
    queueMock.calls = [];

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
