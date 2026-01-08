import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DepotRepository } from '@dossier/depot/depot.repository';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { DepotStep, DepotStatus } from '@lib/dossier';
import { UserEntity } from '@user/user.entity';
import { ControleEntity } from '@dossier/controle/controle.entity';
import { MasaEntity } from '@dossier/masa/masa.entity';
import { startPostgresContainer, stopPostgresContainer, getPostgresConnectionUri } from '../../testcontainer.config';

describe('DepotRepository - Step History Integration Tests', () => {
  let depotGateway: DepotGateway;
  let dataSource: DataSource;
  let postgresUri: string;

  beforeAll(async () => {
    await startPostgresContainer();
    postgresUri = getPostgresConnectionUri();
  }, 60_000);

  afterAll(async () => {
    await stopPostgresContainer();
  }, 60_000);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: postgresUri,
          entities: [DepotEntity, UserEntity, ControleEntity, MasaEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([DepotEntity]),
      ],
      providers: [{ provide: DepotGateway, useClass: DepotRepository }],
    }).compile();

    depotGateway = module.get<DepotGateway>(DepotGateway);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE TABLE depot CASCADE');
    await dataSource.destroy();
  });

  describe('updateDepot with step changes', () => {
    it('should automatically add step to stepHistory when step is updated', async () => {
      // Créer un dépôt initial
      const depot = await depotGateway.createDepot({
        nomOriginalFichier: 'test.xml',
        tailleFichier: 1024,
        type: 'application/xml',
      });

      // Mettre à jour le step
      await depotGateway.updateDepot(depot.id, {
        step: DepotStep.CONTROLE_IN_PROGRESS,
      });

      // Vérifier que l'historique contient le nouveau step
      const updated = await depotGateway.findDepotById(depot.id);
      expect(updated?.step).toBe(DepotStep.CONTROLE_IN_PROGRESS);
      expect(updated?.stepHistory).toEqual([DepotStep.PENDING, DepotStep.CONTROLE_IN_PROGRESS]);
    });

    it('should preserve history across multiple step updates', async () => {
      // Créer un dépôt
      const depot = await depotGateway.createDepot({
        nomOriginalFichier: 'test.xml',
        tailleFichier: 1024,
        type: 'application/xml',
      });

      // Séquence de mises à jour
      await depotGateway.updateDepot(depot.id, { step: DepotStep.CONTROLE_IN_PROGRESS });
      await depotGateway.updateDepot(depot.id, { step: DepotStep.CONTROLE_COMPLETED });
      await depotGateway.updateDepot(depot.id, { step: DepotStep.READY_FOR_SFTP });
      await depotGateway.updateDepot(depot.id, { step: DepotStep.SFTP_IN_PROGRESS });

      // Vérifier l'historique complet
      const updated = await depotGateway.findDepotById(depot.id);
      expect(updated?.step).toBe(DepotStep.SFTP_IN_PROGRESS);
      expect(updated?.stepHistory).toEqual([
        DepotStep.PENDING,
        DepotStep.CONTROLE_IN_PROGRESS,
        DepotStep.CONTROLE_COMPLETED,
        DepotStep.READY_FOR_SFTP,
        DepotStep.SFTP_IN_PROGRESS,
      ]);
    });

    it('should not add duplicate when updating to same step', async () => {
      const depot = await depotGateway.createDepot({
        nomOriginalFichier: 'test.xml',
        tailleFichier: 1024,
        type: 'application/xml',
      });

      // Mettre à jour vers le même step deux fois
      await depotGateway.updateDepot(depot.id, { step: DepotStep.CONTROLE_IN_PROGRESS });
      await depotGateway.updateDepot(depot.id, { step: DepotStep.CONTROLE_IN_PROGRESS });

      const updated = await depotGateway.findDepotById(depot.id);
      expect(updated?.step).toBe(DepotStep.CONTROLE_IN_PROGRESS);
      expect(updated?.stepHistory).toEqual([DepotStep.PENDING, DepotStep.CONTROLE_IN_PROGRESS]);
    });

    it('should update other fields without affecting stepHistory when step is not changed', async () => {
      const depot = await depotGateway.createDepot({
        nomOriginalFichier: 'test.xml',
        tailleFichier: 1024,
        type: 'application/xml',
      });

      // Ajouter un step à l'historique
      await depotGateway.updateDepot(depot.id, { step: DepotStep.CONTROLE_IN_PROGRESS });

      // Mettre à jour d'autres champs sans toucher au step
      await depotGateway.updateDepot(depot.id, {
        status: DepotStatus.REJETE,
        error: 'Test error',
      });

      const updated = await depotGateway.findDepotById(depot.id);
      expect(updated?.step).toBe(DepotStep.CONTROLE_IN_PROGRESS);
      expect(updated?.status).toBe(DepotStatus.REJETE);
      expect(updated?.error).toBe('Test error');
      expect(updated?.stepHistory).toEqual([DepotStep.PENDING, DepotStep.CONTROLE_IN_PROGRESS]);
    });

    it('should update step and other fields simultaneously', async () => {
      const depot = await depotGateway.createDepot({
        nomOriginalFichier: 'test.xml',
        tailleFichier: 1024,
        type: 'application/xml',
      });

      // Mettre à jour step + status en même temps
      await depotGateway.updateDepot(depot.id, {
        step: DepotStep.CONTROLE_FAILED,
        status: DepotStatus.REJETE,
        error: 'Validation failed',
      });

      const updated = await depotGateway.findDepotById(depot.id);
      expect(updated?.step).toBe(DepotStep.CONTROLE_FAILED);
      expect(updated?.status).toBe(DepotStatus.REJETE);
      expect(updated?.error).toBe('Validation failed');
      expect(updated?.stepHistory).toEqual([DepotStep.PENDING, DepotStep.CONTROLE_FAILED]);
    });

    it('should handle workflow-like step transitions correctly', async () => {
      const depot = await depotGateway.createDepot({
        nomOriginalFichier: 'workflow-test.xml',
        tailleFichier: 2048,
        type: 'application/xml',
      });

      // Simuler un workflow complet
      await depotGateway.updateDepot(depot.id, {
        step: DepotStep.CONTROLE_IN_PROGRESS,
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      });

      await depotGateway.updateDepot(depot.id, {
        step: DepotStep.CONTROLE_COMPLETED,
      });

      await depotGateway.updateDepot(depot.id, {
        step: DepotStep.CONTROLE_SANDRE_IN_PROGRESS,
      });

      await depotGateway.updateDepot(depot.id, {
        step: DepotStep.CONTROLE_SANDRE_COMPLETED,
      });

      await depotGateway.updateDepot(depot.id, {
        step: DepotStep.READY_FOR_SFTP,
      });

      await depotGateway.updateDepot(depot.id, {
        step: DepotStep.SFTP_IN_PROGRESS,
      });

      await depotGateway.updateDepot(depot.id, {
        step: DepotStep.SFTP_COMPLETED,
        status: DepotStatus.INTEGRE,
      });

      // Vérifier le workflow complet
      const final = await depotGateway.findDepotById(depot.id);
      expect(final?.step).toBe(DepotStep.SFTP_COMPLETED);
      expect(final?.status).toBe(DepotStatus.INTEGRE);
      expect(final?.stepHistory).toEqual([
        DepotStep.PENDING,
        DepotStep.CONTROLE_IN_PROGRESS,
        DepotStep.CONTROLE_COMPLETED,
        DepotStep.CONTROLE_SANDRE_IN_PROGRESS,
        DepotStep.CONTROLE_SANDRE_COMPLETED,
        DepotStep.READY_FOR_SFTP,
        DepotStep.SFTP_IN_PROGRESS,
        DepotStep.SFTP_COMPLETED,
      ]);
    });

    it('should handle failure scenarios with step history', async () => {
      const depot = await depotGateway.createDepot({
        nomOriginalFichier: 'failure-test.xml',
        tailleFichier: 512,
        type: 'application/xml',
      });

      // Simuler un échec après quelques étapes
      await depotGateway.updateDepot(depot.id, {
        step: DepotStep.CONTROLE_IN_PROGRESS,
      });

      await depotGateway.updateDepot(depot.id, {
        step: DepotStep.CONTROLE_FAILED,
        status: DepotStatus.REJETE,
        error: 'Contrôle échoué',
      });

      const failed = await depotGateway.findDepotById(depot.id);
      expect(failed?.step).toBe(DepotStep.CONTROLE_FAILED);
      expect(failed?.status).toBe(DepotStatus.REJETE);
      expect(failed?.stepHistory).toEqual([
        DepotStep.PENDING,
        DepotStep.CONTROLE_IN_PROGRESS,
        DepotStep.CONTROLE_FAILED,
      ]);
    });
  });
});
