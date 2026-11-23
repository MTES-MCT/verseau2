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
import { IndicateursService } from '../../src/indicateurs/indicateurs.service';
import { Authentication, type AuthenticatedUser } from '@authentication/authentication';
import { MasaProvider } from '@masa/masa.provider';
import type { IndicateurSteuDto } from '@lib/dossier';
import { ThrottlerConfigModule } from '@infra/throttler/throttler.module';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

const user: AuthenticatedUser = {
  cerbereId: 'user-1',
  mel: 'dev@example.com',
  itvCdn: 1,
  isExpertNational: false,
};
const firstSiret = '12345678900001';
const firstSteuCode = 'STEU-1';
const secondSteuCode = 'STEU-2';
const indicateurSteu: IndicateurSteuDto = {
  bassin: 'Bassin test',
  region: 'Région test',
  departement: '75',
  codeSandreAgglo: 'AGGLO-1',
  nomAgglo: 'Agglomération test',
  nature: 'Urbaine',
  trancheObligation: '2000-10000',
  etatAgglo: 'Actif',
  tailleAggloEhAnN: 5000,
  sommeChargesMaxEntrantesEh: 4500,
  codeSandreSteu: firstSteuCode,
  nomSteu: 'Station test',
  capaciteNominaleEhAnN: 6000,
  debitReference: 300,
  chargeEntranteEhAnN: 4500,
  pc95Retenu: null,
  nbAnneesMaxPc95: 0,
  annee: 2025,
  codeSandreScl: null,
  dateValidationConformite: null,
  volumeDeverse5ansPc: null,
  fluxDeverse5ansPc: null,
  joursDeversement5ansMoy: null,
};

describe('IndicateursController (e2e) - Caching', () => {
  let app: INestApplication<App>;
  let indicateursService: IndicateursService;
  let authService: Authentication;
  let masaProvider: MasaProvider;
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

    await app.init();

    indicateursService = app.get<IndicateursService>(IndicateursService);
    authService = app.get<Authentication>(Authentication);
    masaProvider = app.get(MasaProvider);
    cacheManager = app.get(CACHE_MANAGER);
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await cacheManager.clear();
    jest.spyOn(authService, 'validateToken').mockImplementation((token) => {
      return Promise.resolve(token === 'token-user-2' ? { ...user, cerbereId: 'user-2', itvCdn: 2 } : user);
    });
    jest.spyOn(masaProvider, 'findIntervenantById').mockImplementation((itvCdn) => {
      return Promise.resolve({
        intervenantId: itvCdn,
        intervenantSiret: itvCdn === 1 ? firstSiret : '12345678900002',
      });
    });
    jest.spyOn(masaProvider, 'findVSteuSclItvByItvRfa').mockImplementation((siret) => {
      return Promise.resolve([
        {
          ouvrageDepollutionCode: siret === firstSiret ? firstSteuCode : secondSteuCode,
          systemeCollecteCode: '',
          maitreOuvrageSiret: siret,
          prestataireAutosurveillanceSiret: null,
          agenceEauSiret: null,
        },
      ]);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const emptyPaginatedResponse = {
    data: [],
    total: 0,
    page: 1,
    pageSize: 50,
  };

  it('/indicateurs/steu (GET) - should cache the response for the same user', async () => {
    const spy = jest.spyOn(indicateursService, 'getIndicateursSteu').mockResolvedValue(emptyPaginatedResponse);

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
    expect(spy).toHaveBeenCalledWith([firstSteuCode], 1, 50);
  });

  it('/indicateurs/steu (GET) - should NOT share cache between different users', async () => {
    const firstResponse = { ...emptyPaginatedResponse, data: [indicateurSteu], total: 1 };
    const secondResponse = { ...firstResponse, data: [{ ...indicateurSteu, codeSandreSteu: secondSteuCode }] };
    const spy = jest
      .spyOn(indicateursService, 'getIndicateursSteu')
      .mockResolvedValueOnce(firstResponse)
      .mockResolvedValueOnce(secondResponse);

    // First call - User 1
    await request(app.getHttpServer())
      .get('/indicateurs/steu')
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200, firstResponse);

    // Second call - User 2
    await request(app.getHttpServer())
      .get('/indicateurs/steu')
      .set('Cookie', ['access_token=token-user-2'])
      .expect(200, secondResponse);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, [firstSteuCode], 1, 50);
    expect(spy).toHaveBeenNthCalledWith(2, [secondSteuCode], 1, 50);
  });

  it('/indicateurs/steu (GET) - should forbid access without an intervenant even on a cache hit', async () => {
    const spy = jest.spyOn(indicateursService, 'getIndicateursSteu').mockResolvedValue(emptyPaginatedResponse);
    await request(app.getHttpServer())
      .get('/indicateurs/steu')
      .set('Cookie', ['access_token=token-user-1'])
      .expect(200, emptyPaginatedResponse);

    jest.spyOn(authService, 'validateToken').mockResolvedValue({ ...user, itvCdn: null });

    await request(app.getHttpServer())
      .get('/indicateurs/steu')
      .set('Cookie', ['access_token=token-user-1'])
      .expect(403);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('/indicateurs/steu (GET) - should call twice the service if cache is cleared', async () => {
    const spy = jest.spyOn(indicateursService, 'getIndicateursSteu').mockResolvedValue(emptyPaginatedResponse);

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
