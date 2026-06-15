/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceTestMock } from '../mock/shared-mocks';
import request from 'supertest';
import type { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { ApiModule } from '../../src/api/api.module';
import { PGBOSS } from '../../src/infra/queue/queue';
import { InfraModule } from '@infra/infra.module';
import { InfraWithRealDbMockModule } from '../mock/infraWithRealDbMock.module';
import { initTestContainerImports } from '../init/initTestContainer';
import { getPostgresConnectionUri, startPostgresContainer } from '../testcontainer.config';
import { Authentication } from '@authentication/authentication';
import { LoggerService } from '@shared/logger/logger.service';
import { loggerValueMock } from '@shared/logger/logger.mock';
import { ThrottlerConfigModule } from '@infra/throttler/throttler.module';
import {
  createReferentielDataset,
  clearReferentielData,
  seedSteu,
  seedScl,
  seedPmo,
  seedTlref,
  seedPle,
  seedAlr,
  seedPar,
  seedUrf,
  seedItv,
} from '../createReferentielDataset';

const ITV_CDN = 200;
const ITV_RFA = 'SIRET_MESURES_TEST';
const STEU_CDN = 10;
const STEU_SANDRE_CDA = 'STEU_TEST_001';
const SCL_CDN = 20;
const PMO_CDN = 30;
const TLREF16_CDN = 100; // localisation
const PLE_CDN = 1;
const ALR_CDN = 1;
const PAR_RFA = 'MES_CO_TEST';

const mockUser = (
  overrides: Partial<import('@authentication/authentication').AuthenticatedUser> = {},
): import('@authentication/authentication').AuthenticatedUser => ({
  cerbereId: 'test-sub',
  mel: 'test@example.com',
  itvCdn: ITV_CDN,
  isExpertNational: false,
  ...overrides,
});

describe('MesuresController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let authService: Authentication;

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), ApiModule, ThrottlerConfigModule],
    })
      .overrideModule(InfraModule)
      .useModule(InfraWithRealDbMockModule)
      .overrideProvider(PGBOSS)
      .useValue(null)
      .overrideProvider(LoggerService)
      .useValue(loggerValueMock)
      .overrideProvider(ConfigService)
      .useValue(new ConfigServiceTestMock())
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    authService = app.get<Authentication>(Authentication);

    await createReferentielDataset(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await clearReferentielData(dataSource);
    await dataSource.query(`DELETE FROM verseau.mv_steu_scl_itv`);
  });

  // -------------------------------------------------------------------
  // Helper: seed a minimal dataset (STEU + vSteuSclItv + 1 mesure)
  // -------------------------------------------------------------------
  async function seedMinimalDataset() {
    await seedSteu(dataSource, STEU_CDN, STEU_SANDRE_CDA);
    await seedScl(dataSource, SCL_CDN, 'SCL_TEST_001', 'Collecteur Test');
    // Link SCL to STEU so the inner join in findMesures resolves
    await dataSource.query(`UPDATE roseau.scl SET steu_cdn = $1 WHERE scl_cdn = $2`, [STEU_CDN, SCL_CDN]);
    await seedTlref(dataSource, TLREF16_CDN, 'TLREF_RFA', 'A', 'Localisation A');
    await seedPmo(dataSource, PMO_CDN, STEU_CDN, 'PMO01', TLREF16_CDN, {
      sclCdn: SCL_CDN,
      pmoAeCda: 'AE001',
      pmoLb: 'Point de mesure test',
    });
    await seedPar(dataSource, PAR_RFA, 'Matières en suspension');
    await seedUrf(dataSource, 'mg/L', 'mg/L');
    await seedPle(dataSource, PLE_CDN, PMO_CDN, '2024-06-15');
    await seedAlr(dataSource, ALR_CDN, PLE_CDN, PAR_RFA, 'mg/L', 42.5);

    // Seed mv_steu_scl_itv: lien SIRET → STEU
    await dataSource.query(
      `INSERT INTO verseau.mv_steu_scl_itv (steu_cda, scl_cda, mo_itv_rfa, sat_itv_rfa, ae_itv_rfa)
       VALUES ($1, $2, $3, $4, $5)`,
      [STEU_SANDRE_CDA, 'SCL_TEST_001', ITV_RFA, null, null],
    );
  }

  describe('GET /mesures - authorization', () => {
    it('returns 401 when no access token is provided', () => {
      return request(app.getHttpServer()).get('/mesures').expect(401);
    });

    it('returns 403 when user has no itvCdn', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser({ itvCdn: null }));

      await request(app.getHttpServer()).get('/mesures').set('Cookie', ['access_token=token']).expect(403);
    });
  });

  describe('GET /mesures - nominal case', () => {
    beforeEach(async () => {
      await seedMinimalDataset();
      // Seed the intervenant link: itvCdn → itvRfa
      await seedItv(dataSource, ITV_CDN, ITV_RFA);
    });

    it('returns paginated mesures for the authenticated user', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      const response = await request(app.getHttpServer())
        .get('/mesures')
        .set('Cookie', ['access_token=token'])
        .expect(200);

      expect(response.body).toMatchObject({
        page: 1,
        pageSize: 20,
      });
      expect(response.body.total).toBeGreaterThanOrEqual(1);
      expect(response.body.data).toHaveLength(response.body.total);
      expect(response.body.data[0]).toMatchObject({
        ouvrageDepollutionCode: STEU_SANDRE_CDA,
        parametreAnalyseCode: PAR_RFA,
        resultatAnalyseValeur: 42.5,
      });
    });

    it('returns 400 for invalid query params (pageSize > 100)', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      return request(app.getHttpServer())
        .get('/mesures?pageSize=999')
        .set('Cookie', ['access_token=token'])
        .expect(400);
    });

    it('returns 400 for invalid query params (page < 1)', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      return request(app.getHttpServer()).get('/mesures?page=0').set('Cookie', ['access_token=token']).expect(400);
    });
  });

  describe('GET /mesures/ouvrages - authorization', () => {
    it('returns 401 when no access token is provided', () => {
      return request(app.getHttpServer()).get('/mesures/ouvrages').expect(401);
    });

    it('returns 403 when user has no itvCdn', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser({ itvCdn: null }));

      await request(app.getHttpServer()).get('/mesures/ouvrages').set('Cookie', ['access_token=token']).expect(403);
    });
  });

  describe('GET /mesures/ouvrages - nominal case', () => {
    beforeEach(async () => {
      await seedMinimalDataset();
      await seedItv(dataSource, ITV_CDN, ITV_RFA);
    });

    it('returns the list of authorized ouvrages with names', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      const response = await request(app.getHttpServer())
        .get('/mesures/ouvrages')
        .set('Cookie', ['access_token=token'])
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        ouvrageDepollutionCode: STEU_SANDRE_CDA,
      });
    });
  });

  describe('GET /mesures - SCL mode', () => {
    beforeEach(async () => {
      await seedMinimalDataset();
      await seedItv(dataSource, ITV_CDN, ITV_RFA);
    });

    it('returns paginated mesures filtered by SCL code', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      const response = await request(app.getHttpServer())
        .get('/mesures')
        .query({ ouvrageType: 'scl', sclSandreCdas: 'SCL_TEST_001' })
        .set('Cookie', ['access_token=token'])
        .expect(200);

      expect(response.body).toMatchObject({
        page: 1,
        pageSize: 20,
      });
      expect(response.body.total).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0]).toMatchObject({
        ouvrageDepollutionCode: STEU_SANDRE_CDA,
        systemeCollecteCode: 'SCL_TEST_001',
        parametreAnalyseCode: PAR_RFA,
        resultatAnalyseValeur: 42.5,
      });
    });

    it('returns empty when SCL code does not match any authorized SCL', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      const response = await request(app.getHttpServer())
        .get('/mesures')
        .query({ ouvrageType: 'scl', sclSandreCdas: 'SCL_UNKNOWN' })
        .set('Cookie', ['access_token=token'])
        .expect(200);

      expect(response.body).toMatchObject({ data: [], total: 0 });
    });
  });
});
