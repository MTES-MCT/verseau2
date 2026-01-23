import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.join(__dirname, '../test.envfile'),
  override: true,
});

process.env.OIDC_MOCK = 'true';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { ApiModule } from '../../src/api/api.module';
import { InfraModule } from '@infra/infra.module';
import { initTestContainerImports } from '../init/initTestContainer';
import { getPostgresConnectionUri, startPostgresContainer } from '../testcontainer.config';
import { InfraMockModule } from '../mock/infraMock.module';
import { LoggerService } from '@shared/logger/logger.service';
import { loggerValueMock } from '@shared/logger/logger.mock';
import { AuthenticationMiddleware } from '@authentication/authentication.middleware';
import { IndicateursService } from '../../src/indicateurs/indicateurs.service';
import { Authentication } from '@authentication/authentication';
import { ThrottlerConfigModule } from '@infra/throttler/throttler.module';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

describe('IndicateursController (e2e) - Caching', () => {
  let app: INestApplication<App>;
  let indicateursService: IndicateursService;
  let authService: Authentication;
  let cacheManager: Cache;

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), ApiModule, ThrottlerConfigModule],
    })
      .overrideModule(InfraModule)
      .useModule(InfraMockModule)
      .overrideProvider(LoggerService)
      .useValue(loggerValueMock)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());
    const authMiddleware = app.get(AuthenticationMiddleware);
    app.use(authMiddleware.use.bind(authMiddleware));

    await app.init();

    indicateursService = app.get<IndicateursService>(IndicateursService);
    authService = app.get<Authentication>(Authentication);
    cacheManager = app.get(CACHE_MANAGER);
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    await cacheManager.clear();
  });

  it('/indicateurs/steu (GET) - should cache the response for the same user', async () => {
    const spy = jest.spyOn(indicateursService, 'getIndicateursSteu').mockResolvedValue([]);

    // First call
    await request(app.getHttpServer())
      .get('/indicateurs/steu')
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200);

    // Second call
    await request(app.getHttpServer())
      .get('/indicateurs/steu')
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('/indicateurs/steu (GET) - should NOT share cache between different users', async () => {
    const spy = jest.spyOn(indicateursService, 'getIndicateursSteu').mockImplementation(async (cerbereId) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return [{ steuCda: 'STEU-' + cerbereId } as any];
    });

    // Mock different users for different tokens
    jest.spyOn(authService, 'validateToken').mockImplementation(async (token) => {
      const baseUser = {
        cerbereId: 'default',
        login: 'test-user-login',
        nom: 'Test',
        prenom: 'User',
        mel: 'dev@example.com',
        matricule: '1234567890',
        unite: 'DREAL',
        emailMetier: 'dev@example.com',
        description: 'Test',
        mobile: '06',
        telephone: '01',
        profils: [],
        roles: [],
      };
      if (token === 'token-user-1') {
        return { ...baseUser, cerbereId: 'user-1' };
      }
      if (token === 'token-user-2') {
        return { ...baseUser, cerbereId: 'user-2' };
      }
      return baseUser;
    });

    // First call - User 1
    const res1 = await request(app.getHttpServer())
      .get('/indicateurs/steu')
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200);
    expect(res1.body).toEqual([{ steuCda: 'STEU-user-1' }]);

    // Second call - User 2
    const res2 = await request(app.getHttpServer())
      .get('/indicateurs/steu')
      .set('Cookie', ['access_token=token-user-2'])
      .expect(200);

    expect(res2.body).toEqual([{ steuCda: 'STEU-user-2' }]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('/indicateurs/steu (GET) - should call twice the service if cache is cleared', async () => {
    const spy = jest.spyOn(indicateursService, 'getIndicateursSteu').mockResolvedValue([]);

    // First call
    await request(app.getHttpServer())
      .get('/indicateurs/steu')
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200);

    await cacheManager.clear();
    // Second call
    await request(app.getHttpServer())
      .get('/indicateurs/steu')
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200);

    expect(spy).toHaveBeenCalledTimes(2);

    // Third call
    await request(app.getHttpServer())
      .get('/indicateurs/steu')
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200);

    expect(spy).toHaveBeenCalledTimes(2);
  });
});
