import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DepotController } from '@dossier/depot/depot.controller';
import { DeposerUnFichier } from '@dossier/depot/usecase/deposerUnFichier';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { DepotRepository } from '@dossier/depot/depot.repository';
import { DepotStep, DepotStatus } from '@lib/dossier';
import { QueueName, QueueGateway } from '@infra/queue/queue';
import { S3 } from '@infra/s3/s3';
import { Sftp } from '@infra/sftp/sftp';
import { SftpProviderMock } from '@infra/sftp/sftp.provider.mock';
import { Authentication } from '@authentication/authentication';
import { AuthenticationMiddleware } from '@authentication/authentication.middleware';
import { AuthenticationMockService } from '@authentication/authentication.mock.service';
import { LoggerService } from '@shared/logger/logger.service';
import { UserService } from '@user/user.service';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '@user/user.entity';
import { ControleEntity } from '@dossier/controle/controle.entity';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { startPostgresContainer, stopPostgresContainer, getPostgresConnectionUri } from '../../testcontainer.config';
import { MasaEntity } from '@dossier/masa/masa.entity';
import cookieParser from 'cookie-parser';
import { loggerProviderMock } from '@shared/logger/logger.mock';

class ConfigServiceMock {
  get(key: string) {
    if (key === 'FAKE_TOKEN_STORAGE_KEY') {
      return 'test-token';
    }
    return null;
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
      itvCdn: 'itv_mock',
      email: 'test@example.com',
      nom: 'Test',
      prenom: 'User',
      depots: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserEntity;
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
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: getPostgresConnectionUri(),
          dropSchema: true,
          entities: [DepotEntity, UserEntity, ControleEntity, MasaEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([DepotEntity, UserEntity, ControleEntity, MasaEntity]),
      ],
      controllers: [DepotController],
      providers: [
        LoggerService,
        DeposerUnFichier,
        DepotService,
        DepotRepository,
        { provide: DepotGateway, useExisting: DepotRepository },
        { provide: QueueGateway, useClass: QueueServiceMock },
        { provide: S3, useClass: S3Mock },
        { provide: Sftp, useClass: SftpProviderMock },
        { provide: Authentication, useClass: AuthenticationMockService },
        AuthenticationMiddleware,
        { provide: UserService, useClass: UserServiceMock },
        { provide: RoseauGateway, useClass: RoseauGatewayMock },
        { provide: ConfigService, useClass: ConfigServiceMock },
        loggerProviderMock,
      ],
    }).compile();

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
      itvCdn: 'itv_mock',
      email: 'test@example.com',
      nom: 'Test',
      prenom: 'User',
    });
  });

  afterAll(async () => {
    await app?.close();
    await stopPostgresContainer();
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
