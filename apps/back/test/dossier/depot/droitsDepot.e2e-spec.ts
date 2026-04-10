import { CacheModule } from '@nestjs/cache-manager';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { App } from 'supertest/types';
import { DroitsDepotService } from '@dossier/depot/droitsDepot.service';
import { DepotRightsException } from '@dossier/depot/depotError';
import { DroitsUserService } from '@user/droitsUser.service';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { LanceleauRepository } from '@referentiel/lanceleau/lanceleau.repository';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { RoseauBilanGateway } from '@referentiel/roseau/roseauBilan.gateway';
import { RoseauBilanRepository } from '@referentiel/roseau/roseauBilan.repository';
import { RoseauEvenementGateway } from '@referentiel/roseau/roseauEvenement.gateway';
import { RoseauEvenementRepository } from '@referentiel/roseau/roseauEvenement.repository';
import { RoseauRepository } from '@referentiel/roseau/roseau.repository';
import { RoseauTransmissionGateway } from '@referentiel/roseau/roseauTransmission.gateway';
import { RoseauTransmissionRepository } from '@referentiel/roseau/roseauTransmission.repository';
import { MasaProvider } from '@masa/masa.provider';
import { UserGateway } from '@user/user.gateway';
import { UserRepository } from '@user/user.repository';
import { LoggerService } from '@shared/logger/logger.service';
import { LoggerServiceMock } from '@shared/logger/logger.mock';
import { startPostgresContainer, getPostgresConnectionUri } from '../../testcontainer.config';
import { createReferentielDataset } from '../../createReferentielDataset';
import {
  seedUserWithDroits,
  seedUserExpertBassin,
  seedVSteuSclItv,
  seedUserWithoutDroits,
  clearUserWithDroits,
} from '../../userWithDroitsDataset.helper';
import { initTestContainerImports } from '../../init/initTestContainer';

const TEST_USER = {
  sub: 'test-sub',
  email: 'test@example.com',
  itvCdn: 100,
  prCdn: 1000,
  itvRfa: '12345678901234',
};

const EXPERT_BASSIN_USER = {
  sub: 'expert-bassin-sub',
  email: 'expert-bassin@example.com',
  itvCdn: 200,
  prCdn: 2000,
  itvRfa: '99887766554433',
};

describe('DroitsDepotService (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let droitsDepotService: DroitsDepotService;

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), CacheModule.register()],
      providers: [
        DroitsDepotService,
        DroitsUserService,
        MasaProvider,
        LanceleauRepository,
        RoseauRepository,
        RoseauBilanRepository,
        RoseauEvenementRepository,
        UserRepository,
        { provide: LanceleauGateway, useExisting: LanceleauRepository },
        { provide: RoseauGateway, useExisting: RoseauRepository },
        { provide: RoseauBilanGateway, useExisting: RoseauBilanRepository },
        { provide: RoseauEvenementGateway, useExisting: RoseauEvenementRepository },
        RoseauTransmissionRepository,
        { provide: RoseauTransmissionGateway, useExisting: RoseauTransmissionRepository },
        { provide: UserGateway, useExisting: UserRepository },
        { provide: LoggerService, useClass: LoggerServiceMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(getDataSourceToken());
    droitsDepotService = moduleFixture.get(DroitsDepotService);

    await createReferentielDataset(dataSource);
    await dataSource.synchronize();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await clearUserWithDroits(dataSource);
  });

  describe('validation des erreurs', () => {
    it('refuse si aucun code fourni', async () => {
      await seedUserWithDroits(dataSource, TEST_USER);

      await expect(droitsDepotService.validateDroits(TEST_USER.sub, [], [])).rejects.toThrow(DepotRightsException);
    });

    it('refuse si utilisateur non trouvé', async () => {
      await expect(droitsDepotService.validateDroits('unknown-sub', ['STEU01'], [])).rejects.toThrow(
        DepotRightsException,
      );
    });

    it('refuse si pas de lien AG', async () => {
      await seedUserWithoutDroits(dataSource, { sub: 'no-ag-sub', email: 'noag@example.com' });

      await expect(droitsDepotService.validateDroits('no-ag-sub', ['STEU01'], [])).rejects.toThrow(
        DepotRightsException,
      );
    });

    it('refuse si pas de role 301', async () => {
      const userWithoutRole = { ...TEST_USER, sub: 'no-role-sub', email: 'norole@example.com', itvRfa: undefined };
      await seedUserWithDroits(dataSource, userWithoutRole);

      await expect(droitsDepotService.validateDroits('no-role-sub', ['STEU01'], [])).rejects.toThrow(
        DepotRightsException,
      );
    });

    it("refuse si l'ouvrage de dépollution n'est pas trouvé", async () => {
      await seedUserWithDroits(dataSource, TEST_USER);

      await expect(droitsDepotService.validateDroits(TEST_USER.sub, ['STEU_INCONNU'], [])).rejects.toThrow(
        DepotRightsException,
      );
    });

    it("refuse si le système de collecte n'est pas trouvé", async () => {
      await seedUserWithDroits(dataSource, TEST_USER);

      await expect(droitsDepotService.validateDroits(TEST_USER.sub, [], ['SCL_INCONNU'])).rejects.toThrow(
        DepotRightsException,
      );
    });
  });

  describe('validation des droits via mo_itv_rfa', () => {
    it('valide les droits pour un STEU via mo_itv_rfa', async () => {
      await seedUserWithDroits(dataSource, TEST_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', '', TEST_USER.itvRfa);

      await expect(droitsDepotService.validateDroits(TEST_USER.sub, ['STEU01'], [])).resolves.toBeUndefined();
    });

    it('valide les droits pour un SCL via mo_itv_rfa', async () => {
      await seedUserWithDroits(dataSource, TEST_USER);
      await seedVSteuSclItv(dataSource, '', 'SCL01', TEST_USER.itvRfa);

      await expect(droitsDepotService.validateDroits(TEST_USER.sub, [], ['SCL01'])).resolves.toBeUndefined();
    });

    it('refuse si le SIRET ne correspond pas au mo_itv_rfa', async () => {
      await seedUserWithDroits(dataSource, TEST_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', '', 'AUTRE_SIRET');

      await expect(droitsDepotService.validateDroits(TEST_USER.sub, ['STEU01'], [])).rejects.toThrow(
        DepotRightsException,
      );
    });
  });

  describe('validation des droits via sat_itv_rfa', () => {
    it('valide les droits pour un STEU via sat_itv_rfa', async () => {
      await seedUserWithDroits(dataSource, TEST_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', '', 'AUTRE_MO', TEST_USER.itvRfa);

      await expect(droitsDepotService.validateDroits(TEST_USER.sub, ['STEU01'], [])).resolves.toBeUndefined();
    });

    it('valide les droits pour un SCL via sat_itv_rfa', async () => {
      await seedUserWithDroits(dataSource, TEST_USER);
      await seedVSteuSclItv(dataSource, '', 'SCL01', 'AUTRE_MO', TEST_USER.itvRfa);

      await expect(droitsDepotService.validateDroits(TEST_USER.sub, [], ['SCL01'])).resolves.toBeUndefined();
    });

    it('valide les droits pour un STEU via sat_itv_rfa, avec mo_itv_rfa existant', async () => {
      await seedUserWithDroits(dataSource, TEST_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', 'UN_SIRET', 'AUTRE_MO', TEST_USER.itvRfa, 'A');
      await seedVSteuSclItv(dataSource, 'STEU01', 'UN_SIRET', 'AUTRE_MO', 'UN_SIRET_DIFFERENT', 'B');

      await expect(droitsDepotService.validateDroits(TEST_USER.sub, ['STEU01'], [])).resolves.toBeUndefined();
    });
  });

  describe('validation des droits via ae_itv_rfa', () => {
    it('valide les droits pour un STEU via ae_itv_rfa', async () => {
      await seedUserWithDroits(dataSource, TEST_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', '', 'AUTRE_MO', undefined, TEST_USER.itvRfa);

      await expect(droitsDepotService.validateDroits(TEST_USER.sub, ['STEU01'], [])).resolves.toBeUndefined();
    });

    it('valide les droits pour un SCL via ae_itv_rfa', async () => {
      await seedUserWithDroits(dataSource, TEST_USER);
      await seedVSteuSclItv(dataSource, '', 'SCL01', 'AUTRE_MO', undefined, TEST_USER.itvRfa);

      await expect(droitsDepotService.validateDroits(TEST_USER.sub, [], ['SCL01'])).resolves.toBeUndefined();
    });
  });

  describe('cas combinés', () => {
    it('refuse si le SIRET ne correspond à aucun des trois champs', async () => {
      await seedUserWithDroits(dataSource, TEST_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', '', 'AUTRE_MO', 'AUTRE_SAT', 'AUTRE_AE');

      await expect(droitsDepotService.validateDroits(TEST_USER.sub, ['STEU01'], [])).rejects.toThrow(
        DepotRightsException,
      );
    });

    it('valide les droits pour plusieurs codes STEU et SCL simultanément', async () => {
      await seedUserWithDroits(dataSource, TEST_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', '', TEST_USER.itvRfa);
      await seedVSteuSclItv(dataSource, 'STEU02', '', 'AUTRE_MO', TEST_USER.itvRfa);
      await seedVSteuSclItv(dataSource, '', 'SCL01', 'AUTRE_MO', undefined, TEST_USER.itvRfa);

      await expect(
        droitsDepotService.validateDroits(TEST_USER.sub, ['STEU01', 'STEU02'], ['SCL01']),
      ).resolves.toBeUndefined();
    });
  });

  describe('expert bassin — droits par ouvrage', () => {
    it('valide les droits pour un STEU si le SIRET correspond', async () => {
      await seedUserExpertBassin(dataSource, EXPERT_BASSIN_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', '', EXPERT_BASSIN_USER.itvRfa);

      await expect(droitsDepotService.validateDroits(EXPERT_BASSIN_USER.sub, ['STEU01'], [])).resolves.toBeUndefined();
    });

    it('valide les droits pour un SCL si le SIRET correspond', async () => {
      await seedUserExpertBassin(dataSource, EXPERT_BASSIN_USER);
      await seedVSteuSclItv(dataSource, '', 'SCL01', EXPERT_BASSIN_USER.itvRfa);

      await expect(droitsDepotService.validateDroits(EXPERT_BASSIN_USER.sub, [], ['SCL01'])).resolves.toBeUndefined();
    });

    it("refuse si le SIRET ne correspond pas à l'ouvrage", async () => {
      await seedUserExpertBassin(dataSource, EXPERT_BASSIN_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', '', 'AUTRE_SIRET');

      await expect(droitsDepotService.validateDroits(EXPERT_BASSIN_USER.sub, ['STEU01'], [])).rejects.toThrow(
        DepotRightsException,
      );
    });

    it('refuse si le SIRET ne correspond à aucun des trois champs', async () => {
      await seedUserExpertBassin(dataSource, EXPERT_BASSIN_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', '', 'AUTRE_MO', 'AUTRE_SAT', 'AUTRE_AE');

      await expect(droitsDepotService.validateDroits(EXPERT_BASSIN_USER.sub, ['STEU01'], [])).rejects.toThrow(
        DepotRightsException,
      );
    });
  });
});
