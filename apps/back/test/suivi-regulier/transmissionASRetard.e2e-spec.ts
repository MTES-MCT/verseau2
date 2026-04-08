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
  findTransmissionASRetardSteu: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  findTransmissionASRetardScl: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  findSteuBatchBySandreCdas: jest
    .fn()
    .mockResolvedValue([{ ouvrageDepollutionIdentifiant: 101, ouvrageDepollutionCode: 'STEU_A' }]),
  findSclBatchBySandreCdas: jest
    .fn()
    .mockResolvedValue([{ systemeCollecteIdentifiant: 201, systemeCollecteCode: 'SCL_A' }]),
  findIntervenantById: jest.fn().mockResolvedValue({
    intervenantIdentifiant: 1,
    intervenantSiret: 'SIRET_TEST',
  }),
  findVSteuSclItvByItvRfa: jest.fn().mockResolvedValue([
    {
      ouvrageDepollutionCode: 'STEU_A',
      systemeCollecteCode: 'SCL_A',
      maitreOuvrageSiret: null,
      prestataireAutosurveillanceSiret: null,
      agenceEauSiret: null,
      exploitantSiret: 'SIRET_TEST',
    },
  ]),
};

describe('TransmissionASRetardController (e2e)', () => {
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

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    authService = moduleFixture.get<Authentication>(Authentication);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('/suivi-regulier/transmission-as-retard/steu (GET)', async () => {
    jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

    const res = await request(app.getHttpServer() as App)
      .get('/suivi-regulier/transmission-as-retard/steu')
      .set('Cookie', ['access_token=valid-token'])
      .query({ year: 2025, page: 1, pageSize: 10, codeSandre: 'STEU_A' })
      .expect(200);

    expect(res.body).toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
  });

  it('/suivi-regulier/transmission-as-retard/scl (GET)', async () => {
    jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser());

    const res = await request(app.getHttpServer() as App)
      .get('/suivi-regulier/transmission-as-retard/scl')
      .set('Cookie', ['access_token=valid-token'])
      .query({ year: 2025, page: 1, pageSize: 10, codeSandre: 'SCL_A' })
      .expect(200);

    expect(res.body).toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
  });
});
