import { CacheModule } from '@nestjs/cache-manager';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { App } from 'supertest/types';
import { DroitsDepotService } from '@dossier/depot/droitsDepot.service';
import { DepotError, DepotRightsException } from '@dossier/depot/depotError';
import { DroitsUserService } from '@user/droitsUser.service';
import { LanceleauGateway } from '@referentiel/lanceleau/lanceleau.gateway';
import { LanceleauRepository } from '@referentiel/lanceleau/lanceleau.repository';
import { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { RoseauReferentielPointMesureGateway } from '@referentiel/roseau/roseauReferentielPointMesure.gateway';
import { RoseauReferentielPointMesureRepository } from '@referentiel/roseau/roseauReferentielPointMesure.repository';
import { RoseauBilanGateway } from '@referentiel/roseau/roseauBilan.gateway';
import { RoseauBilanRepository } from '@referentiel/roseau/roseauBilan.repository';
import { RoseauConformiteGateway } from '@referentiel/roseau/roseauConformite.gateway';
import { RoseauConformiteRepository } from '@referentiel/roseau/roseauConformite.repository';
import { RoseauEvenementGateway } from '@referentiel/roseau/roseauEvenement.gateway';
import { RoseauEvenementRepository } from '@referentiel/roseau/roseauEvenement.repository';
import { RoseauRepository } from '@referentiel/roseau/roseau.repository';
import { RoseauTransmissionGateway } from '@referentiel/roseau/roseauTransmission.gateway';
import { RoseauMesureDeposeeGateway } from '@referentiel/roseau/roseauMesureDeposee.gateway';
import { RoseauTransmissionRepository } from '@referentiel/roseau/roseauTransmission.repository';
import { RoseauMesureDeposeeRepository } from '@referentiel/roseau/roseauMesureDeposee.repository';
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
  seedUserRole308,
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

const ROLE_308_USER = {
  sub: 'role-308-sub',
  email: 'role-308@example.com',
  itvCdn: 300,
  prCdn: 3000,
  itvRfa: '11223344556677',
};

describe('DroitsDepotService (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let droitsDepotService: DroitsDepotService;
  let droitsUserService: DroitsUserService;
  let lanceleauRepository: LanceleauRepository;

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
        RoseauReferentielPointMesureRepository,
        RoseauBilanRepository,
        RoseauConformiteRepository,
        RoseauEvenementRepository,
        UserRepository,
        { provide: LanceleauGateway, useExisting: LanceleauRepository },
        { provide: RoseauGateway, useExisting: RoseauRepository },
        { provide: RoseauReferentielPointMesureGateway, useExisting: RoseauReferentielPointMesureRepository },
        { provide: RoseauBilanGateway, useExisting: RoseauBilanRepository },
        { provide: RoseauConformiteGateway, useExisting: RoseauConformiteRepository },
        { provide: RoseauEvenementGateway, useExisting: RoseauEvenementRepository },
        RoseauTransmissionRepository,
        { provide: RoseauTransmissionGateway, useExisting: RoseauTransmissionRepository },
        RoseauMesureDeposeeRepository,
        { provide: RoseauMesureDeposeeGateway, useExisting: RoseauMesureDeposeeRepository },
        { provide: UserGateway, useExisting: UserRepository },
        { provide: LoggerService, useClass: LoggerServiceMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(getDataSourceToken());
    droitsDepotService = moduleFixture.get(DroitsDepotService);
    droitsUserService = moduleFixture.get(DroitsUserService);
    lanceleauRepository = moduleFixture.get(LanceleauRepository);

    await createReferentielDataset(dataSource);
    await dataSource.synchronize();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await clearUserWithDroits(dataSource);
  });

  describe('identification par le claim email Cerbère', () => {
    it.each(['contact@example.com', ''])(
      'résout les droits, le SIRET et le contact via login_lb quand mail vaut %j',
      async (orionMail) => {
        await seedUserWithDroits(dataSource, {
          ...TEST_USER,
          orionMail,
          agMail: '  contact-ag@example.com  ',
          agNom: '  Agent  ',
          agPrenom: '  Verseau  ',
        });

        await expect(droitsUserService.resolveVerseauAccess(TEST_USER.email)).resolves.toEqual({
          itvCdn: TEST_USER.itvCdn,
          isExpertNational: false,
        });
        await expect(droitsUserService.resolveItvCdn(TEST_USER.sub)).resolves.toBe(TEST_USER.itvCdn);
        await expect(lanceleauRepository.findSiretByEmail(`  ${TEST_USER.email}  `)).resolves.toBe(TEST_USER.itvRfa);
        await expect(lanceleauRepository.findAgentByOrionLogin(`  ${TEST_USER.email}  `)).resolves.toMatchObject({
          mail: 'contact-ag@example.com',
          nom: 'Agent',
          prenom: 'Verseau',
        });
      },
    );

    it('ne se rabat pas sur mail quand login_lb ne correspond pas', async () => {
      await seedUserWithDroits(dataSource, {
        ...TEST_USER,
        email: 'autre-login@example.com',
        orionMail: TEST_USER.email,
      });

      await expect(lanceleauRepository.findAgentByOrionLogin(TEST_USER.email)).resolves.toBeNull();
      await expect(lanceleauRepository.findSiretByEmail(TEST_USER.email)).resolves.toBeNull();
      await expect(droitsUserService.resolveVerseauAccess(TEST_USER.email)).rejects.toThrow(ForbiddenException);
    });

    it.each([null, '', '  '])(
      'refuse la connexion si le mail AG vaut %j malgré le rôle autorisé et le mail Orion',
      async (agMail) => {
        await seedUserWithDroits(dataSource, { ...TEST_USER, agMail });

        await expect(droitsUserService.resolveVerseauAccess(TEST_USER.email)).rejects.toThrow(ForbiddenException);
      },
    );

    it('autorise la connexion sans nom et prénom AG dès lors que le mail et le rôle sont présents', async () => {
      await seedUserWithDroits(dataSource, { ...TEST_USER, agNom: null, agPrenom: null });

      await expect(droitsUserService.resolveVerseauAccess(TEST_USER.email)).resolves.toEqual({
        itvCdn: TEST_USER.itvCdn,
        isExpertNational: false,
      });
    });
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

  describe('role 308 — droits par ouvrage', () => {
    it('valide les droits pour un STEU si le SIRET correspond', async () => {
      await seedUserRole308(dataSource, ROLE_308_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', '', ROLE_308_USER.itvRfa);

      await expect(droitsDepotService.validateDroits(ROLE_308_USER.sub, ['STEU01'], [])).resolves.toBeUndefined();
    });

    it('valide les droits pour un SCL si le SIRET correspond', async () => {
      await seedUserRole308(dataSource, ROLE_308_USER);
      await seedVSteuSclItv(dataSource, '', 'SCL01', ROLE_308_USER.itvRfa);

      await expect(droitsDepotService.validateDroits(ROLE_308_USER.sub, [], ['SCL01'])).resolves.toBeUndefined();
    });

    it("refuse si le SIRET ne correspond pas à l'ouvrage", async () => {
      await seedUserRole308(dataSource, ROLE_308_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', '', 'AUTRE_SIRET');

      await expect(droitsDepotService.validateDroits(ROLE_308_USER.sub, ['STEU01'], [])).rejects.toThrow(
        DepotRightsException,
      );
    });

    it("refuse si le role 308 n'a pas de SIRET exploitable", async () => {
      await seedUserRole308(dataSource, { ...ROLE_308_USER, sub: 'role-308-no-siret-sub', itvRfa: undefined });
      await seedVSteuSclItv(dataSource, 'STEU01', '', ROLE_308_USER.itvRfa);

      await expect(droitsDepotService.validateDroits('role-308-no-siret-sub', ['STEU01'], [])).rejects.toThrow(
        DepotRightsException,
      );
    });

    it('refuse les flux qualifies meme si le SIRET correspond', async () => {
      await seedUserRole308(dataSource, ROLE_308_USER);
      await seedVSteuSclItv(dataSource, 'STEU01', '', ROLE_308_USER.itvRfa);

      await expect(droitsDepotService.validateDroits(ROLE_308_USER.sub, ['STEU01'], [], true)).rejects.toThrow(
        new DepotRightsException(DepotError.FLUX_QUALIFIE_INTERDIT),
      );
    });
  });
});
