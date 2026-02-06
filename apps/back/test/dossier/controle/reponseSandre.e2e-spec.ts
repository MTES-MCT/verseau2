import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { DepotRepository } from '@dossier/depot/depot.repository';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { ReponseSandreEntity } from '@dossier/controle/technique/sandre/reponseSandre.entity';
import { ReponseSandreRepository } from '@dossier/controle/technique/sandre/reponseSandre.repository';
import { ReponseSandreGateway } from '@dossier/controle/technique/sandre/reponseSandre.gateway';
import { UserEntity } from '@user/user.entity';
import { ControleEntity } from '@dossier/controle/controle.entity';
import { MasaEntity } from '@dossier/masa/masa.entity';
import { SandreAcceptationStatus } from '@lib/dossier';
import { startPostgresContainer, getPostgresConnectionUri } from '../../testcontainer.config';
import { loggerProviderMock } from '@shared/logger/logger.mock';
import type { App } from 'supertest/types';

describe('ReponseSandreRepository (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let repository: ReponseSandreRepository;

  const depotId = 'dep_test_sandre_001';

  beforeAll(async () => {
    await startPostgresContainer();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: getPostgresConnectionUri(),
          dropSchema: true,
          entities: [DepotEntity, ReponseSandreEntity, UserEntity, ControleEntity, MasaEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([DepotEntity, ReponseSandreEntity]),
      ],
      providers: [
        ReponseSandreRepository,
        DepotRepository,
        { provide: DepotGateway, useExisting: DepotRepository },
        { provide: ReponseSandreGateway, useExisting: ReponseSandreRepository },
        loggerProviderMock,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    repository = moduleFixture.get(ReponseSandreRepository);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM reponse_sandre');
    await dataSource.query('DELETE FROM depot');

    await dataSource.getRepository(DepotEntity).save({
      id: depotId,
      nomOriginalFichier: 'test.xml',
      type: 'application/xml',
      tailleFichier: 1024,
    });
  });

  const validReponseSandreData = {
    depotId,
    jeton: 'test-jeton-001',
    acceptationStatus: SandreAcceptationStatus.CONFORMANT,
    isConformant: true,
    codeScenario: 'FCT_ASSAIN',
    versionScenario: '4',
    errors: [],
  };

  it('should create a reponse sandre for a depot', async () => {
    const result = await repository.createReponseSandre(validReponseSandreData);

    expect(result).toBeDefined();
    expect(result.id).toMatch(/^res_/);
    expect(result.jeton).toBe('test-jeton-001');
    expect(result.acceptationStatus).toBe(SandreAcceptationStatus.CONFORMANT);
    expect(result.isConformant).toBe(true);
    expect(result.codeScenario).toBe('FCT_ASSAIN');
    expect(result.versionScenario).toBe('4');
  });

  it('should throw NotFoundException when depot does not exist', async () => {
    await expect(
      repository.createReponseSandre({
        ...validReponseSandreData,
        depotId: 'dep_nonexistent',
      }),
    ).rejects.toThrow('Depot with id dep_nonexistent not found');
  });

  it('should return existing record on duplicate depot_id instead of throwing', async () => {
    const first = await repository.createReponseSandre(validReponseSandreData);

    const second = await repository.createReponseSandre({
      ...validReponseSandreData,
      jeton: 'different-jeton',
    });

    expect(second.id).toBe(first.id);
    expect(second.jeton).toBe(first.jeton);

    const allForDepot = await repository.findByDepotId(depotId);
    expect(allForDepot).toHaveLength(1);
  });
});
