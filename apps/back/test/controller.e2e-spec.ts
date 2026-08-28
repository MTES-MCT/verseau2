import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.join(__dirname, 'test.envfile'),
  override: true,
});

import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { ApiModule } from '../src/api/api.module';
import { PGBOSS } from '../src/infra/queue/queue';
import { InfraModule } from '@infra/infra.module';
import { initTestContainerImports } from './init/initTestContainer';
import { getPostgresConnectionUri, startPostgresContainer } from './testcontainer.config';
import { InfraMockModule } from './mock/infraMock.module';
import { InfraWithRealDbMockModule } from './mock/infraWithRealDbMock.module';
import { Authentication } from '@authentication/authentication';
import { LoggerService } from '@shared/logger/logger.service';
import { loggerValueMock } from '@shared/logger/logger.mock';
import { MasaProvider } from '@masa/masa.provider';
import { ThrottlerConfigModule } from '@infra/throttler/throttler.module';
import { DataSource } from 'typeorm';
import { DepotStatus, MasaStatus } from '@lib/dossier';
import { DroitsDepotService } from '@dossier/depot/droitsDepot.service';
import { DepotError, DepotRightsException } from '@dossier/depot/depotError';
import {
  createLanceleauTables,
  createReferentielSchemas,
  clearLanceleauData,
  seedUser,
  seedDepot,
  clearUserData,
  clearDepotData,
} from './createReferentielDataset';
import { MasaService } from '@dossier/masa/masa.service';
import { MasaWebhookStatus } from '@dossier/masa/masa.model';
import { MasaIpGuard } from '@dossier/masa/masaIp.guard';

describe('Controller (e2e) - Access control', () => {
  let app: INestApplication<App>;
  let authService: Authentication;
  let masaService: MasaService;
  let masaIpGuard: MasaIpGuard;
  let masaProvider: MasaProvider;

  const mockAuthenticatedUser = (
    overrides: Partial<import('@authentication/authentication').AuthenticatedUser> = {},
  ): import('@authentication/authentication').AuthenticatedUser => ({
    cerbereId: 'test-user-id',
    mel: 'dev@example.com',
    itvCdn: 100,
    isExpertNational: false,
    ...overrides,
  });

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), ApiModule, ThrottlerConfigModule],
    })
      .overrideModule(InfraModule)
      .useModule(InfraMockModule)
      .overrideProvider(PGBOSS)
      .useValue(null)
      .overrideProvider(LoggerService)
      .useValue(loggerValueMock)

      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());
    await app.init();
    authService = app.get<Authentication>(Authentication);
    masaService = app.get<MasaService>(MasaService);
    masaIpGuard = app.get<MasaIpGuard>(MasaIpGuard);
    masaProvider = app.get<MasaProvider>(MasaProvider);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

    it('/auth/refresh (POST) - Should return 201', async () => {
      jest.spyOn(authService, 'extractSubjectFromExpiredToken').mockResolvedValueOnce('test-user-id');
      jest.spyOn(authService, 'refreshTokens').mockResolvedValueOnce({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        expiresIn: 3600,
      });
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=refresh-token-abc', 'access_token=mock-token'])
        .expect(201);
    });

    it('/auth/refresh (POST) - Should return 401 when refreshTokens throw an error', async () => {
      jest.spyOn(authService, 'refreshTokens').mockRejectedValueOnce(new Error('Refresh failed'));
      jest.spyOn(authService, 'extractSubjectFromExpiredToken').mockResolvedValueOnce('test-user-id');
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=refresh-token-abc', 'access_token=mock-token'])
        .expect(401);
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

    it('/depot/:depotId/masa (GET) - Should return 401 Unauthorized when no token is provided', async () => {
      return request(app.getHttpServer()).get('/depot/1/masa').expect(401);
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

    it.each(['/admin/depot', '/admin/depot/dep_forbidden/rapport', '/admin/depot/dep_forbidden/xml'])(
      '%s (GET) - Should return 403 Forbidden for a non-admin user',
      async (endpoint) => {
        jest.spyOn(authService, 'validateToken').mockResolvedValue(mockAuthenticatedUser());

        return request(app.getHttpServer()).get(endpoint).set('Cookie', ['access_token=token-user-1']).expect(403);
      },
    );
  });

  describe('Controller (e2e) - Masa', () => {
    it('/webhook/masa/agent-verseau (POST) - Should return 401 Unauthorized', async () => {
      return request(app.getHttpServer())
        .post('/webhook/masa/agent-verseau')
        .expect('X-Source', 'Verseau2')
        .expect(401);
    });

    it('/webhook/masa/agent-verseau (POST) - Should return 400 Bad Request', async () => {
      return request(app.getHttpServer())
        .post('/webhook/masa/agent-verseau')
        .set('x-api-key', 'private-token')
        .send({})
        .expect('X-Source', 'Verseau2')
        .expect(400);
    });

    it('/webhook/masa/agent-verseau (POST) - Should return 403 Forbidden', async () => {
      jest.spyOn(masaIpGuard, 'canActivate').mockImplementation(() => {
        throw new ForbiddenException('IP is not allowed');
      });

      return request(app.getHttpServer())
        .post('/webhook/masa/agent-verseau')
        .set('x-api-key', 'private-token')
        .expect('X-Source', 'Verseau2')
        .expect(403);
    });

    it('/webhook/masa/agent-verseau (POST) - Should return 200 OK', async () => {
      jest.spyOn(masaService, 'processRetourAgentVerseau').mockResolvedValue({
        id: 'masa-id-123',
        depotId: 'dep_test_001',
        numeroDepotVerseau1: '1234567890',
        statut: MasaStatus.INTEGRE,
        statutMasa: MasaWebhookStatus.INTEGRE,
        rapport: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const response = await request(app.getHttpServer())
        .post('/webhook/masa/agent-verseau')
        .set('x-api-key', 'private-token')
        .send({
          verseau2DepotId: 'dep_test_001',
          numeroDepotVerseau1: '1234567890',
          statut: MasaWebhookStatus.INTEGRE,
          rapport: 'test',
        })
        .expect('X-Source', 'Verseau2')
        .expect(200);
      return response;
    });

    it('/webhook/masa/agent-verseau (POST) - Should return 200 OK when numeroDepotVerseau1 is null', async () => {
      jest.spyOn(masaService, 'processRetourAgentVerseau').mockResolvedValue({
        id: 'masa-id-123',
        depotId: 'dep_test_001',
        numeroDepotVerseau1: null,
        statut: MasaStatus.INTEGRE,
        statutMasa: MasaWebhookStatus.INTEGRE,
        rapport: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const response = await request(app.getHttpServer())
        .post('/webhook/masa/agent-verseau')
        .set('x-api-key', 'private-token')
        .send({
          verseau2DepotId: 'dep_test_001',
          numeroDepotVerseau1: null,
          statut: MasaWebhookStatus.INTEGRE,
          rapport: 'test',
        })
        .expect(200);
      return response;
    });

    it('/webhook/masa/agent-verseau (POST) - Should normalize a NULL numeroDepotVerseau1', async () => {
      const processRetourAgentVerseau = jest.spyOn(masaService, 'processRetourAgentVerseau').mockResolvedValue({
        id: 'masa-id-123',
        depotId: 'dep_01m0fnz8t33qwq4pzqw6tney3a',
        numeroDepotVerseau1: null,
        statut: MasaStatus.REFUSE,
        statutMasa: MasaWebhookStatus.ERREUR_BLOQUANTE,
        rapport: "<p>Le dépôt automatique du fichier n'a pas pu être effectué.</p>",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const payload = {
        verseau2DepotId: 'dep_01m0fnz8t33qwq4pzqw6tney3a',
        numeroDepotVerseau1: 'NULL',
        statut: 'Erreur bloquante',
        rapport: "<p>Le dépôt automatique du fichier n'a pas pu être effectué.</p>",
      };

      await request(app.getHttpServer())
        .post('/webhook/masa/agent-verseau')
        .set('x-api-key', 'private-token')
        .send(payload)
        .expect(200);

      expect(processRetourAgentVerseau).toHaveBeenCalledWith({
        ...payload,
        numeroDepotVerseau1: null,
        statut: MasaWebhookStatus.ERREUR_BLOQUANTE,
      });
    });
  });

  describe('Controller (e2e) - Referentiel', () => {
    it('/referentiel/codes-to-parametres (GET) - Should return 401 Unauthorized', async () => {
      return request(app.getHttpServer()).get('/referentiel/codes-to-parametres').expect(401);
    });

    it('/referentiel/parametres (POST) - Should return 401 Unauthorized', async () => {
      return request(app.getHttpServer())
        .post('/referentiel/parametres')
        .send({ codes: ['1313'] })
        .expect(401);
    });

    it('/referentiel/points-mesure (GET) - Should return 401 Unauthorized', async () => {
      return request(app.getHttpServer())
        .get('/referentiel/points-mesure')
        .query({ ouvrageType: 'steu', ouvrageCode: 'STEU001' })
        .expect(401);
    });

    it.each([
      '/referentiel/points-mesure?ouvrageType=steu&ouvrageCode=STEU001',
      '/referentiel/steu/STEU001/detail',
      '/referentiel/scl/SCL001/detail',
    ])('%s (GET) - Should return 403 Forbidden when user has no intervenant', async (endpoint) => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockAuthenticatedUser({ itvCdn: null }));

      return request(app.getHttpServer()).get(endpoint).set('Cookie', ['access_token=token-user-1']).expect(403);
    });

    it('/referentiel/points-mesure (GET) - Should return 403 Forbidden for an unauthorized ouvrage', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockAuthenticatedUser());
      jest.spyOn(masaProvider, 'findIntervenantById').mockResolvedValue({
        intervenantId: 100,
        intervenantSiret: 'SIRET001',
      });
      jest.spyOn(masaProvider, 'findVSteuSclItvByItvRfa').mockResolvedValue([
        {
          ouvrageDepollutionCode: 'STEU001',
          systemeCollecteCode: null as unknown as string,
          maitreOuvrageSiret: null,
          prestataireAutosurveillanceSiret: null,
          agenceEauSiret: null,
        },
      ]);

      return request(app.getHttpServer())
        .get('/referentiel/points-mesure')
        .query({ ouvrageType: 'steu', ouvrageCode: 'STEU002' })
        .set('Cookie', ['access_token=token-user-1'])
        .expect(403);
    });
  });

  describe('IndicateursController (e2e)', () => {
    it('/indicateurs/steu (GET) - Should return 401 Unauthorized when no token is provided', async () => {
      return request(app.getHttpServer()).get('/indicateurs/steu').expect(401);
    });
    it('/indicateurs/steu (GET) - Should return 200 when a token is provided', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue({
        cerbereId: 'test-user-id',
        mel: 'dev@example.com',
        itvCdn: 100,
        isExpertNational: false,
      });

      return request(app.getHttpServer())
        .get('/indicateurs/steu')
        .set('Cookie', ['access_token=token-user-1'])
        .expect(200);
    });
  });
});

describe('DepotController (e2e) - droits-de-depot errorCode mapping', () => {
  let app: INestApplication<App>;
  let droitsDepotService: DroitsDepotService;
  let authService: Authentication;

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), ApiModule, ThrottlerConfigModule],
    })
      .overrideModule(InfraModule)
      .useModule(InfraMockModule)
      .overrideProvider(PGBOSS)
      .useValue(null)
      .overrideProvider(LoggerService)
      .useValue(loggerValueMock)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());
    await app.init();

    droitsDepotService = moduleFixture.get(DroitsDepotService);
    authService = moduleFixture.get(Authentication);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return authorized: true when validateDroits succeeds', async () => {
    jest.spyOn(authService, 'validateToken').mockResolvedValue({
      cerbereId: 'test-user-id',
      mel: 'dev@example.com',
      itvCdn: 100,
      isExpertNational: false,
    });
    jest.spyOn(droitsDepotService, 'validateDroits').mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .get('/depot/droits-de-depot')
      .query({ cdOuvrageDepollution: 'STEU01', isFluxQualifie: 'true' })
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200);

    expect(response.body).toEqual({ authorized: true });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(droitsDepotService.validateDroits).toHaveBeenCalledWith(expect.any(String), ['STEU01'], [], true);
  });

  it('should return errorCode FLUX_QUALIFIE_INTERDIT when service throws FLUX_QUALIFIE_INTERDIT', async () => {
    jest.spyOn(authService, 'validateToken').mockResolvedValue({
      cerbereId: 'test-user-id',
      mel: 'dev@example.com',
      itvCdn: 100,
      isExpertNational: false,
    });
    jest
      .spyOn(droitsDepotService, 'validateDroits')
      .mockRejectedValue(new DepotRightsException(DepotError.FLUX_QUALIFIE_INTERDIT));

    const response = await request(app.getHttpServer())
      .get('/depot/droits-de-depot')
      .query({ cdOuvrageDepollution: 'STEU01', isFluxQualifie: 'true' })
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200);

    expect(response.body).toEqual({
      authorized: false,
      errorCode: 'FLUX_QUALIFIE_INTERDIT',
    });
  });

  it('should return errorCode DROITS_INSUFFISANTS when service throws DROITS_INSUFFISANTS', async () => {
    jest.spyOn(authService, 'validateToken').mockResolvedValue({
      cerbereId: 'test-user-id',
      mel: 'dev@example.com',
      itvCdn: 100,
      isExpertNational: false,
    });
    jest
      .spyOn(droitsDepotService, 'validateDroits')
      .mockRejectedValue(new DepotRightsException(DepotError.DROITS_INSUFFISANTS));

    const response = await request(app.getHttpServer())
      .get('/depot/droits-de-depot')
      .query({ cdOuvrageDepollution: 'STEU01' })
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200);

    expect(response.body).toEqual({
      authorized: false,
      errorCode: 'DROITS_INSUFFISANTS',
    });
  });

  it('should pass isFluxQualifie=false when query param is absent', async () => {
    jest.spyOn(authService, 'validateToken').mockResolvedValue({
      cerbereId: 'test-user-id',
      mel: 'dev@example.com',
      itvCdn: 100,
      isExpertNational: false,
    });
    jest.spyOn(droitsDepotService, 'validateDroits').mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .get('/depot/droits-de-depot')
      .query({ cdOuvrageDepollution: 'STEU01' })
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(droitsDepotService.validateDroits).toHaveBeenCalledWith(expect.any(String), ['STEU01'], [], false);
  });
});

describe('Depot access guards (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let authService: Authentication;

  const TEST_USER_SUB = 'test-user-id';
  const TEST_USER_EMAIL = 'dev@example.com';
  const OWNER_ITV_CDN = 100;
  const OTHER_ITV_CDN = 999;
  const DEPOT_ID = 'dep_guard-test-depot';

  const mockUser = (
    overrides: Partial<import('@authentication/authentication').AuthenticatedUser> = {},
  ): import('@authentication/authentication').AuthenticatedUser => ({
    cerbereId: TEST_USER_SUB,
    mel: TEST_USER_EMAIL,
    itvCdn: null,
    isExpertNational: false,
    ...overrides,
  });

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), ApiModule, ThrottlerConfigModule],
    })
      .overrideModule(InfraModule)
      .useModule(InfraWithRealDbMockModule)
      .overrideProvider(LoggerService)
      .useValue(loggerValueMock)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    authService = app.get<Authentication>(Authentication);

    await createReferentielSchemas(dataSource);
    await createLanceleauTables(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await clearLanceleauData(dataSource);
    await clearDepotData(dataSource, DEPOT_ID);
    await clearUserData(dataSource, TEST_USER_SUB);
  });

  it('/depot/:depotId/controle (GET) - Should return 404 when depot does not exist', async () => {
    jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser({ itvCdn: OWNER_ITV_CDN }));
    return request(app.getHttpServer())
      .get('/depot/nonexistent-depot-id/controle')
      .set('Cookie', ['access_token=token-user-1'])
      .expect(404);
  });

  describe('when user owns the depot (HasUserAccessToDepotGuard passes)', () => {
    beforeEach(async () => {
      await seedUser(dataSource, 'guard-test-user', TEST_USER_SUB, TEST_USER_EMAIL);
      await seedDepot(dataSource, DEPOT_ID, OWNER_ITV_CDN, DepotStatus.EN_COURS_DE_TRAITEMENT);
      // Le token JWT interne contient itvCdn = OWNER_ITV_CDN, qui correspond au dépôt
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser({ itvCdn: OWNER_ITV_CDN }));
    });

    it('/depot/:depotId/controle (GET) - Should return 200', async () => {
      return request(app.getHttpServer())
        .get(`/depot/${DEPOT_ID}/controle`)
        .set('Cookie', ['access_token=token-user-1'])
        .expect(200);
    });

    it('/depot/:depotId/controle/sandre (GET) - Should return 200', async () => {
      return request(app.getHttpServer())
        .get(`/depot/${DEPOT_ID}/controle/sandre`)
        .set('Cookie', ['access_token=token-user-1'])
        .expect(200);
    });

    it('/depot/:depotId/masa (GET) - Should return 200', async () => {
      return request(app.getHttpServer())
        .get(`/depot/${DEPOT_ID}/masa`)
        .set('Cookie', ['access_token=token-user-1'])
        .expect(200);
    });
  });

  describe('when user is admin / expert national (IsAdminGuard passes)', () => {
    beforeEach(async () => {
      await seedUser(dataSource, 'guard-test-user', TEST_USER_SUB, TEST_USER_EMAIL);
      await seedDepot(dataSource, DEPOT_ID, OTHER_ITV_CDN, DepotStatus.EN_COURS_DE_TRAITEMENT);
      // Le token JWT interne contient isExpertNational = true (itvCdn != dépôt mais admin)
      jest
        .spyOn(authService, 'validateToken')
        .mockResolvedValue(mockUser({ itvCdn: OWNER_ITV_CDN, isExpertNational: true }));
    });

    it('/depot/:depotId/controle (GET) - Should return 200', async () => {
      return request(app.getHttpServer())
        .get(`/depot/${DEPOT_ID}/controle`)
        .set('Cookie', ['access_token=token-user-1'])
        .expect(200);
    });

    it('/depot/:depotId/controle/sandre (GET) - Should return 200', async () => {
      return request(app.getHttpServer())
        .get(`/depot/${DEPOT_ID}/controle/sandre`)
        .set('Cookie', ['access_token=token-user-1'])
        .expect(200);
    });

    it('/depot/:depotId/masa (GET) - Should return 200', async () => {
      return request(app.getHttpServer())
        .get(`/depot/${DEPOT_ID}/masa`)
        .set('Cookie', ['access_token=token-user-1'])
        .expect(200);
    });
  });

  describe('when user has no access and is not admin (both guards fail)', () => {
    beforeEach(async () => {
      await seedUser(dataSource, 'guard-test-user', TEST_USER_SUB, TEST_USER_EMAIL);
      await seedDepot(dataSource, DEPOT_ID, OTHER_ITV_CDN, DepotStatus.EN_COURS_DE_TRAITEMENT);
      // Le token JWT interne contient itvCdn != dépôt et isExpertNational = false
      jest
        .spyOn(authService, 'validateToken')
        .mockResolvedValue(mockUser({ itvCdn: OWNER_ITV_CDN, isExpertNational: false }));
    });

    it('/depot/:depotId/controle (GET) - Should return 403', async () => {
      return request(app.getHttpServer())
        .get(`/depot/${DEPOT_ID}/controle`)
        .set('Cookie', ['access_token=token-user-1'])
        .expect(403);
    });

    it('/depot/:depotId/controle/sandre (GET) - Should return 403', async () => {
      return request(app.getHttpServer())
        .get(`/depot/${DEPOT_ID}/controle/sandre`)
        .set('Cookie', ['access_token=token-user-1'])
        .expect(403);
    });

    it('/depot/:depotId/masa (GET) - Should return 403', async () => {
      return request(app.getHttpServer())
        .get(`/depot/${DEPOT_ID}/masa`)
        .set('Cookie', ['access_token=token-user-1'])
        .expect(403);
    });

    it('/depot/:id/rapport (GET) - Should return 403', async () => {
      return request(app.getHttpServer())
        .get(`/depot/${DEPOT_ID}/rapport`)
        .set('Cookie', ['access_token=token-user-1'])
        .expect(403);
    });

    it('/depot/:id/xml (GET) - Should return 403', async () => {
      return request(app.getHttpServer())
        .get(`/depot/${DEPOT_ID}/xml`)
        .set('Cookie', ['access_token=token-user-1'])
        .expect(403);
    });
  });
});

describe('ReferentielController (e2e) - points-mesure', () => {
  let app: INestApplication<App>;
  let authService: Authentication;
  let masaProvider: MasaProvider;

  const STEU_CODE = 'STEU001';

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), ApiModule, ThrottlerConfigModule],
    })
      .overrideModule(InfraModule)
      .useModule(InfraMockModule)
      .overrideProvider(PGBOSS)
      .useValue(null)
      .overrideProvider(LoggerService)
      .useValue(loggerValueMock)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());
    await app.init();

    authService = app.get<Authentication>(Authentication);
    masaProvider = app.get<MasaProvider>(MasaProvider);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('/referentiel/points-mesure (GET) - Should return 200 with points for an authorized steu', async () => {
    jest.spyOn(authService, 'validateToken').mockResolvedValue({
      cerbereId: 'test-user-id',
      mel: 'dev@example.com',
      itvCdn: 100,
      isExpertNational: false,
    });
    jest.spyOn(masaProvider, 'findIntervenantById').mockResolvedValue({
      intervenantId: 100,
      intervenantSiret: 'SIRET001',
    });
    jest.spyOn(masaProvider, 'findVSteuSclItvByItvRfa').mockResolvedValue([
      {
        ouvrageDepollutionCode: STEU_CODE,
        systemeCollecteCode: null as unknown as string,
        maitreOuvrageSiret: null,
        prestataireAutosurveillanceSiret: null,
        agenceEauSiret: null,
      },
    ]);
    jest.spyOn(masaProvider, 'findPointsMesureReferentiel').mockResolvedValue([
      {
        ouvrageCode: STEU_CODE,
        ouvrageNom: 'Station test',
        pointAgenceEauNumero: 'AG001',
        pointMesureNumero: 'P1',
        pointMesureLibelle: 'Point entrée',
        pointMesureLocalisationCode: 'ENT',
        pointMesureLocalisationLibelle: 'Entrée',
        pointMesureCategorieSystemeCollecte: 'REG',
        pointMesureValiditeDebutDate: '2020-01-01',
        pointMesureValiditeFinDate: null,
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/referentiel/points-mesure')
      .query({ ouvrageType: 'steu', ouvrageCode: STEU_CODE })
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200);

    expect(response.body).toEqual([
      {
        ouvrageCode: STEU_CODE,
        ouvrageNom: 'Station test',
        pointAgenceEauNumero: 'AG001',
        pointMesureNumero: 'P1',
        pointMesureLibelle: 'Point entrée',
        pointMesureLocalisationCode: 'ENT',
        pointMesureLocalisationLibelle: 'Entrée',
        pointMesureCategorieSystemeCollecte: 'REG',
        pointMesureValiditeDebutDate: '2020-01-01',
        pointMesureValiditeFinDate: null,
      },
    ]);
  });
});

describe('ReferentielController (e2e) - parametres', () => {
  let app: INestApplication<App>;
  let authService: Authentication;
  let masaProvider: MasaProvider;

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), ApiModule, ThrottlerConfigModule],
    })
      .overrideModule(InfraModule)
      .useModule(InfraMockModule)
      .overrideProvider(PGBOSS)
      .useValue(null)
      .overrideProvider(LoggerService)
      .useValue(loggerValueMock)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());
    await app.init();

    authService = app.get<Authentication>(Authentication);
    masaProvider = app.get<MasaProvider>(MasaProvider);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('/referentiel/parametres (POST) - Should return ordered parameters for posted codes', async () => {
    jest.spyOn(authService, 'validateToken').mockResolvedValue({
      cerbereId: 'test-user-id',
      mel: 'dev@example.com',
      itvCdn: 100,
      isExpertNational: false,
    });
    jest.spyOn(masaProvider, 'findParametresByCodes').mockResolvedValue([
      {
        parametreAnalyseCode: '1313',
        parametreNomCourt: 'DBO5',
      },
      {
        parametreAnalyseCode: '1314',
        parametreNomCourt: 'DCO',
      },
    ]);

    const response = await request(app.getHttpServer())
      .post('/referentiel/parametres')
      .set('Cookie', ['access_token=token-user-1'])
      .send({ codes: ['1313', '1314'] })
      .expect(201);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(masaProvider.findParametresByCodes).toHaveBeenCalledWith(['1313', '1314']);
    expect(response.body).toEqual([
      {
        parametreAnalyseCode: '1313',
        parametreNomCourt: 'DBO5',
      },
      {
        parametreAnalyseCode: '1314',
        parametreNomCourt: 'DCO',
      },
    ]);
  });
});
