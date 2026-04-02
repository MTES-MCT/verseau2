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
  findEvenementSteu: jest.fn(),
  findSclBatchBySandreCdas: jest.fn(),
  findEvenementScl: jest.fn(),
} as unknown as jest.Mocked<
  Pick<
    MasaProvider,
    | 'findIntervenantById'
    | 'findVSteuSclItvByItvRfa'
    | 'findSteuBatchBySandreCdas'
    | 'findEvenementSteu'
    | 'findSclBatchBySandreCdas'
    | 'findEvenementScl'
  >
>;

describe('EvenementController (e2e)', () => {
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

  describe('GET /suivi-regulier/evenement/steu', () => {
    const currentYear = new Date().getFullYear();

    it('returns 401 when no access token is provided', () => {
      return request(app.getHttpServer()).get(`/suivi-regulier/evenement/steu?year=${currentYear}`).expect(401);
    });

    it('returns paginated evenement STEU', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      mockMasaProvider.findIntervenantById.mockResolvedValue({
        intervenantIdentifiant: 1,
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
        { ouvrageDepollutionIdentifiant: 10, ouvrageDepollutionCode: 'STEU_TEST_001' },
      ]);

      mockMasaProvider.findEvenementSteu.mockResolvedValue({
        data: [
          {
            typeEvenementCode: 'TYPE_1',
            typeEvenementLibelle: 'Type 1',
            prisEnCompte: true,
            date: `${currentYear}-01-01`,
            finalite: null,
            commentaire: null,
          },
        ],
        total: 1,
      });

      const response = await request(app.getHttpServer())
        .get(`/suivi-regulier/evenement/steu?year=${currentYear}&page=1&pageSize=20`)
        .set('Cookie', ['access_token=token'])
        .expect(200);

      expect(response.body).toMatchObject({
        page: 1,
        pageSize: 20,
        total: 1,
        data: [
          {
            typeEvenementCode: 'TYPE_1',
          },
        ],
      });

      expect(mockMasaProvider.findEvenementSteu).toHaveBeenCalledWith({
        steuCdns: [10],
        year: currentYear,
        page: 1,
        pageSize: 20,
      });
    });

    it('returns empty list if user has no authorized STEU', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      mockMasaProvider.findIntervenantById.mockResolvedValue({
        intervenantIdentifiant: 1,
        intervenantSiret: 'SIRET_TEST',
      });
      mockMasaProvider.findVSteuSclItvByItvRfa.mockResolvedValue([
        {
          ouvrageDepollutionCode: 'STEU_OTHER',
          systemeCollecteCode: 'SCL_TEST_001',
          maitreOuvrageSiret: null,
          prestataireAutosurveillanceSiret: null,
          agenceEauSiret: null,
        },
      ]);
      // If user asks for a specific STEU they don't have access to
      const response = await request(app.getHttpServer())
        .get(`/suivi-regulier/evenement/steu?year=${currentYear}&ouvrageDepollutionCode=STEU_TEST_001`)
        .set('Cookie', ['access_token=token'])
        .expect(200);

      expect(response.body).toMatchObject({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      expect(mockMasaProvider.findEvenementSteu).not.toHaveBeenCalled();
    });
  });

  describe('GET /suivi-regulier/evenement/scl', () => {
    const currentYear = new Date().getFullYear();

    it('returns 401 when no access token is provided', () => {
      return request(app.getHttpServer()).get(`/suivi-regulier/evenement/scl?year=${currentYear}`).expect(401);
    });

    it('returns paginated evenement SCL', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

      mockMasaProvider.findIntervenantById.mockResolvedValue({
        intervenantIdentifiant: 1,
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
        { systemeCollecteIdentifiant: 20, systemeCollecteCode: 'SCL_TEST_001' },
      ]);

      mockMasaProvider.findEvenementScl.mockResolvedValue({
        data: [
          {
            typeEvenementCode: 'TYPE_2',
            typeEvenementLibelle: 'Type 2',
            prisEnCompte: true,
            date: `${currentYear}-01-01`,
            finalite: null,
            commentaire: null,
            pointMesureNumero: 'PM_1',
            pointMesureLibelle: 'Point mesure 1',
          },
        ],
        total: 1,
      });

      const response = await request(app.getHttpServer())
        .get(`/suivi-regulier/evenement/scl?year=${currentYear}&page=1&pageSize=20`)
        .set('Cookie', ['access_token=token'])
        .expect(200);

      expect(response.body).toMatchObject({
        page: 1,
        pageSize: 20,
        total: 1,
        data: [
          {
            typeEvenementCode: 'TYPE_2',
          },
        ],
      });

      expect(mockMasaProvider.findEvenementScl).toHaveBeenCalledWith({
        sclCdns: [20],
        year: currentYear,
        page: 1,
        pageSize: 20,
      });
    });
  });
});
