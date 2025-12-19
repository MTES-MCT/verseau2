import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.join(__dirname, 'mocks', 'test.envfile'),
  override: true,
});

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ApiModule } from '../src/api/api.module';
import { PGBOSS } from '../src/infra/queue/queue';
import { DatabaseMockModule } from './mocks/databaseMock.module';
import { InfraModule } from '@infra/infra.module';
import { AuthenticationModule } from '@authentication/authentication.module';
import { QueueModule } from '../src/infra/queue/queue.module';
import { SftpModule } from '../src/infra/sftp/sftp.module';
import { Module, Global } from '@nestjs/common';
import { ConfigurationModule } from '../src/infra/config/configuration.module';
import { S3 } from '@s3/s3';

@Module({
  imports: [],
  exports: [S3],
})
class S3MockModule {
  constructor() {}
}

@Global()
@Module({
  imports: [
    DatabaseMockModule,
    AuthenticationModule,
    S3MockModule,
    QueueModule,
    SftpModule.forRootAsync(),
    ConfigurationModule,
  ],
  exports: [DatabaseMockModule, AuthenticationModule, S3MockModule, QueueModule, SftpModule, ConfigurationModule],
})
class InfraTestModule {}

describe.skip('Controller (e2e) - Unauthorized', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiModule],
    })
      .overrideModule(InfraModule)
      .useModule(InfraTestModule)
      .overrideProvider(PGBOSS)
      .useValue({
        on: jest.fn(),
        start: jest.fn(),
        createQueue: jest.fn(),
        stop: jest.fn(),
        send: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Controller (e2e) - Version', () => {
    it('/version (GET) - Should return 401', async () => {
      return request(app.getHttpServer()).get('/version').expect(401);
    });
  });

  describe('Controller (e2e) - Authentication', () => {
    // Public endpoints
    it('/auth/login (GET) - Should return 200', async () => {
      return request(app.getHttpServer()).get('/auth/login').expect(200);
    });

    it('/auth/callback (POST) - Should return 400 for missing body (Public)', async () => {
      // Expecting 400 Bad Request because we are not sending body, but it proves access is allowed (not 401)
      return request(app.getHttpServer()).post('/auth/callback').send({}).expect(400);
    });

    it('/auth/refresh (POST) - Should return 401 Unauthorized', async () => {
      return request(app.getHttpServer()).post('/auth/refresh').send({}).expect(401);
    });

    it('/auth/logout (POST) - Should return 401 Unauthorized', async () => {
      return request(app.getHttpServer()).post('/auth/logout').send({}).expect(401);
    });

    // Protected endpoints
    it('/auth/me (GET) - Should return 401 Unauthorized when no token is provided', async () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('Controller (e2e) - Controle', () => {
    it('/depot/:depotId/controle (GET) - Should return 401 Unauthorized when no token is provided', async () => {
      return request(app.getHttpServer()).get('/depot/1/controle').expect(401);
    });

    it('/depot/:depotId/controle/sandre (GET) - Should return 401 Unauthorized when no token is provided', async () => {
      return request(app.getHttpServer()).get('/depot/1/controle/sandre').expect(401);
    });
  });

  describe('Controller (e2e) - Depot', () => {
    it('/depot/upload (POST) - Should return 401 Unauthorized when no token is provided', async () => {
      return request(app.getHttpServer()).post('/depot/upload').expect(401);
    });

    it('/depot (GET) - Should return 401 Unauthorized when no token is provided', async () => {
      return request(app.getHttpServer()).get('/depot').expect(401);
    });

    it('/depot/droits-de-depot (GET) - Should return 401 Unauthorized when no token is provided', async () => {
      return request(app.getHttpServer()).get('/depot/droits-de-depot').expect(401);
    });
  });

  describe('Controller (e2e) - DepotAdmin', () => {
    it('/admin/depot (GET) - Should return 401 Unauthorized when no token is provided', async () => {
      return request(app.getHttpServer()).get('/admin/depot').expect(401);
    });
  });

  describe('Controller (e2e) - Masa', () => {
    it('/webhook/masa/agent-verseau (POST) - Should return 401 Unauthorized', async () => {
      return request(app.getHttpServer()).post('/webhook/masa/agent-verseau').expect(401);
    });

    // it('/webhook/masa/agent-verseau (POST) - Should return 201 Unauthorized', async () => {
    //   //MASA_API_KEY=private-token
    //   return request(app.getHttpServer())
    //     .post('/webhook/masa/agent-verseau')
    //     .set('x-api-key', 'private-token')
    //     .send({})
    //     .expect(201);
    // });
  });

  describe('Controller (e2e) - Referentiel', () => {
    it('/referentiel/maitre-ouvrage-ouvrage-depollution (GET) - Should return 401 Unauthorized', async () => {
      return request(app.getHttpServer()).get('/referentiel/maitre-ouvrage-ouvrage-depollution').expect(401);
    });

    it('/referentiel/parametre-to-code (GET) - Should return 401 Unauthorized', async () => {
      return request(app.getHttpServer()).get('/referentiel/parametre-to-code').expect(401);
    });

    it('/referentiel/parametres-to-codes (GET) - Should return 401 Unauthorized', async () => {
      return request(app.getHttpServer()).get('/referentiel/parametres-to-codes').expect(401);
    });

    it('/referentiel/codes-to-parametres (GET) - Should return 401 Unauthorized', async () => {
      return request(app.getHttpServer()).get('/referentiel/codes-to-parametres').expect(401);
    });
  });
});
