import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConfigServiceTestMock } from '../mock/shared-mocks';
import request from 'supertest';
import type { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { ApiModule } from '../../src/api/api.module';
import { PGBOSS } from '../../src/infra/queue/queue';
import { InfraModule } from '@infra/infra.module';
import { CodeParametre } from '@lib/dossier';
import { InfraWithRealDbMockModule } from '../mock/infraWithRealDbMock.module';
import { initTestContainerImports } from '../init/initTestContainer';
import { getPostgresConnectionUri, startPostgresContainer } from '../testcontainer.config';
import { Authentication } from '@authentication/authentication';
import { LoggerService } from '@shared/logger/logger.service';
import { loggerValueMock } from '@shared/logger/logger.mock';
import { ThrottlerConfigModule } from '@infra/throttler/throttler.module';
import { MasaProvider } from '@masa/masa.provider';

const mockUser = (
  overrides: Partial<import('@authentication/authentication').AuthenticatedUser> = {},
): import('@authentication/authentication').AuthenticatedUser => ({
  cerbereId: 'test-sub',
  mel: 'test@example.com',
  itvCdn: 200,
  isExpertNational: false,
  ...overrides,
});

const mockMasaProvider = {
  findIntervenantById: jest.fn(),
  findVSteuSclItvByItvRfa: jest.fn(),
  findSteuBatchBySandreCdas: jest.fn(),
  findBilanSteu: jest.fn(),
  findBilanSteuDetail: jest.fn(),
  findSclBatchBySandreCdas: jest.fn(),
  findBilanScl: jest.fn(),
  findBilanSclDetail: jest.fn(),
} as unknown as jest.Mocked<
  Pick<
    MasaProvider,
    | 'findIntervenantById'
    | 'findVSteuSclItvByItvRfa'
    | 'findSteuBatchBySandreCdas'
    | 'findBilanSteu'
    | 'findBilanSteuDetail'
    | 'findSclBatchBySandreCdas'
    | 'findBilanScl'
    | 'findBilanSclDetail'
  >
>;

describe('BilanController (e2e)', () => {
  let app: INestApplication<App>;
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
      .overrideProvider(MasaProvider)
      .useValue(mockMasaProvider)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());
    await app.init();

    authService = app.get<Authentication>(Authentication);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /suivi-regulier/bilan/steu', () => {
    const currentYear = new Date().getFullYear();

    it('returns 401 when no access token is provided', () => {
      return request(app.getHttpServer()).get(`/suivi-regulier/bilan/steu?year=${currentYear}`).expect(401);
    });

    it('returns paginated bilan STEU', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      mockMasaProvider.findIntervenantById.mockResolvedValue({
        intervenantId: 1,
        intervenantSiret: 'SIRET_TEST',
      });
      mockMasaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([
        {
          ouvrageDepollutionCode: 'STEU_TEST_001',
          systemeCollecteCode: 'SCL_TEST_001',
          maitreOuvrageSiret: null,
          prestataireAutosurveillanceSiret: null,
          agenceEauSiret: null,
        },
      ]);

      mockMasaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionId: 10, ouvrageDepollutionCode: 'STEU_TEST_001' },
      ]);

      mockMasaProvider.findBilanSteu.mockResolvedValue({
        data: [
          {
            steuCdn: 10,
            ouvrageDepollutionCode: 'STEU_TEST_001',
            bilanEcarteParSpe: true,
            date: `${currentYear}-01-01`,
            parametreNom: 'DBO5',
            hcnf: 'Non',
            evt: 'Non',
            finalite: 'Autosurveillance',
          },
        ],
        total: 1,
      });

      const response = await request(app.getHttpServer())
        .get(`/suivi-regulier/bilan/steu?year=${currentYear}&parametreCode=${CodeParametre.DBO5}&page=1&pageSize=20`)
        .set('Cookie', ['access_token=token'])
        .expect(200);

      expect(response.body).toMatchObject({
        page: 1,
        pageSize: 20,
        total: 1,
        data: [
          {
            ouvrageDepollutionCode: 'STEU_TEST_001',
            bilanEcarteParSpe: true,
            parametreNom: 'DBO5',
          },
        ],
      });

      expect(mockMasaProvider.findBilanSteu).toHaveBeenCalledWith({
        ouvrageDepollutionIds: [10],
        startDate: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        endDate: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
        parametreCodes: [CodeParametre.DBO5].map(String),
        page: 1,
        pageSize: 20,
      });
    });
  });

  describe('GET /suivi-regulier/bilan/steu/export', () => {
    it('returns a csv file with headers', async () => {
      const currentYear = new Date().getFullYear();
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      mockMasaProvider.findIntervenantById.mockResolvedValue({
        intervenantId: 1,
        intervenantSiret: 'SIRET_TEST',
      });
      mockMasaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([
        {
          ouvrageDepollutionCode: 'STEU_TEST_001',
          systemeCollecteCode: 'SCL_TEST_001',
          maitreOuvrageSiret: null,
          prestataireAutosurveillanceSiret: null,
          agenceEauSiret: null,
        },
      ]);
      mockMasaProvider.findSteuBatchBySandreCdas.mockResolvedValue([
        { ouvrageDepollutionId: 10, ouvrageDepollutionCode: 'STEU_TEST_001' },
      ]);
      mockMasaProvider.findBilanSteu.mockResolvedValue({
        data: [
          {
            steuCdn: 10,
            ouvrageDepollutionCode: 'STEU_TEST_001',
            bilanEcarteParSpe: true,
            date: `${currentYear}-01-01`,
            parametreNom: 'DBO5',
            hcnf: 'Non',
            evt: 'Non',
            finalite: 'Autosurveillance',
          },
        ],
        total: 1,
      });

      const response = await request(app.getHttpServer())
        .get(
          `/suivi-regulier/bilan/steu/export?year=${currentYear}&parametreCode=${CodeParametre.DBO5}&page=1&pageSize=20`,
        )
        .set('Cookie', ['access_token=token'])
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain(`bilan-steu-${currentYear}.csv`);
      expect(response.text).toContain('Bilan écarté par le SPE (A)');
      expect(response.text).toContain('DBO5');
    });
  });

  describe('GET /referentiel/steu/:ouvrageDepollutionCode/detail', () => {
    it('returns detail bilan STEU', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      mockMasaProvider.findIntervenantById.mockResolvedValue({
        intervenantId: 1,
        intervenantSiret: 'SIRET_TEST',
      });
      mockMasaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([
        {
          ouvrageDepollutionCode: 'STEU_TEST_001',
          systemeCollecteCode: 'SCL_TEST_001',
          maitreOuvrageSiret: null,
          prestataireAutosurveillanceSiret: null,
          agenceEauSiret: null,
        },
      ]);
      mockMasaProvider.findBilanSteuDetail.mockResolvedValue({
        ouvrageDepollutionCode: 'STEU_TEST_001',
        dateMiseEnService: '2000-01-01',
        intervenants: [
          { role: 'exploitant', intervenantNom: 'Exploitant test', intervenantSiret: '12345678901234' },
          { role: 'maitre_ouvrage', intervenantNom: 'MOA test', intervenantSiret: '43210987654321' },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/referentiel/steu/STEU_TEST_001/detail')
        .set('Cookie', ['access_token=token'])
        .expect(200);

      expect(response.body).toMatchObject({
        ouvrageDepollutionCode: 'STEU_TEST_001',
        dateMiseEnService: '2000-01-01',
        exploitants: [{ intervenantNom: 'Exploitant test', intervenantSiret: '12345678901234' }],
        maitresOuvrage: [{ intervenantNom: 'MOA test', intervenantSiret: '43210987654321' }],
      });
    });
  });

  describe('GET /suivi-regulier/bilan/scl', () => {
    const currentYear = new Date().getFullYear();

    it('returns 401 when no access token is provided', () => {
      return request(app.getHttpServer()).get(`/suivi-regulier/bilan/scl?year=${currentYear}`).expect(401);
    });

    it('returns paginated bilan SCL', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      mockMasaProvider.findIntervenantById.mockResolvedValue({
        intervenantId: 1,
        intervenantSiret: 'SIRET_TEST',
      });
      mockMasaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([
        {
          ouvrageDepollutionCode: 'STEU_TEST_001',
          systemeCollecteCode: 'SCL_TEST_001',
          maitreOuvrageSiret: null,
          prestataireAutosurveillanceSiret: null,
          agenceEauSiret: null,
        },
      ]);

      mockMasaProvider.findSclBatchBySandreCdas.mockResolvedValue([
        { systemeCollecteId: 20, systemeCollecteCode: 'SCL_TEST_001' },
      ]);

      mockMasaProvider.findBilanScl.mockResolvedValue({
        data: [
          {
            sclCdn: 20,
            systemeCollecteCode: 'SCL_TEST_001',
            systemeCollecteNom: 'Systeme collecte 1',
            pointMesureId: 1,
            pointMesureNumero: 'PM_1',
            pointMesureLibelle: 'Point mesure 1',
            date: `${currentYear}-01-01`,
            volumeDeverse: 100,
            tempsDeversement: 2,
            statut: 'TP',
          },
        ],
        total: 1,
      });

      const response = await request(app.getHttpServer())
        .get(`/suivi-regulier/bilan/scl?year=${currentYear}&page=1&pageSize=20`)
        .set('Cookie', ['access_token=token'])
        .expect(200);

      expect(response.body).toMatchObject({
        page: 1,
        pageSize: 20,
        total: 1,
        data: [
          {
            systemeCollecteCode: 'SCL_TEST_001',
            systemeCollecteNom: 'Systeme collecte 1',
            pointMesureNumero: 'PM_1',
            statut: 'TP',
          },
        ],
      });

      expect(mockMasaProvider.findBilanScl).toHaveBeenCalledWith({
        systemeCollecteIds: [20],
        startDate: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        endDate: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
        page: 1,
        pageSize: 20,
      });
    });
  });

  describe('GET /referentiel/scl/:systemeCollecteCode/detail', () => {
    it('returns detail bilan SCL', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      mockMasaProvider.findIntervenantById.mockResolvedValue({
        intervenantId: 1,
        intervenantSiret: 'SIRET_TEST',
      });
      mockMasaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([
        {
          ouvrageDepollutionCode: 'STEU_TEST_001',
          systemeCollecteCode: 'SCL_TEST_001',
          maitreOuvrageSiret: null,
          prestataireAutosurveillanceSiret: null,
          agenceEauSiret: null,
        },
      ]);
      mockMasaProvider.findBilanSclDetail.mockResolvedValue({
        systemeCollecteCode: 'SCL_TEST_001',
        intervenants: [
          { role: 'exploitant', intervenantNom: 'Exploitant test', intervenantSiret: '12345678901234' },
          { role: 'maitre_ouvrage', intervenantNom: 'MOA test', intervenantSiret: '43210987654321' },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/referentiel/scl/SCL_TEST_001/detail')
        .set('Cookie', ['access_token=token'])
        .expect(200);

      expect(response.body).toMatchObject({
        systemeCollecteCode: 'SCL_TEST_001',
        exploitants: [{ intervenantNom: 'Exploitant test', intervenantSiret: '12345678901234' }],
        maitresOuvrage: [{ intervenantNom: 'MOA test', intervenantSiret: '43210987654321' }],
      });
    });
  });
});
