import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DepotRepository } from '@dossier/depot/depot.repository';
import { DepotGateway } from '@dossier/depot/depot.gateway';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { DepotStep, DepotStatus, EtapeMetier } from '@lib/dossier';
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
  });

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

    it('should handle concurrent updates to step (race condition) using pessimistic locking', async () => {
      // Create initial depot
      const depot = await depotGateway.createDepot({
        nomOriginalFichier: 'race-test.xml',
        tailleFichier: 1024,
        type: 'application/xml',
      });

      // Launch multiple updates in parallel
      const stepsToUpdate = [
        DepotStep.CONTROLE_IN_PROGRESS,
        DepotStep.CONTROLE_COMPLETED,
        DepotStep.READY_FOR_SFTP,
        DepotStep.SFTP_IN_PROGRESS,
      ];

      // We use Promise.all to trigger them concurrently
      // The pessimistic lock in updateDepot should ensure they are processed one after another
      await Promise.all(
        stepsToUpdate.map((step) =>
          depotGateway.updateDepot(depot.id, {
            step,
          }),
        ),
      );

      const updated = await depotGateway.findDepotById(depot.id);

      // The final step should be one of the steps (the last one processed)
      expect(stepsToUpdate).toContain(updated?.step);

      // The history should contain PENDING + all 4 steps, in some order
      // (The order depends on which transaction got the lock first, but all should be present)
      expect(updated?.stepHistory).toHaveLength(5); // PENDING + 4 updates
      expect(updated?.stepHistory).toContain(DepotStep.PENDING);
      stepsToUpdate.forEach((step) => {
        expect(updated?.stepHistory).toContain(step);
      });
    });

    it('should handle concurrent updates to DepotStatus (race condition) using pessimistic locking', async () => {
      // Create initial depot
      const depot = await depotGateway.createDepot({
        nomOriginalFichier: 'status-race.xml',
        tailleFichier: 1024,
        type: 'application/xml',
      });

      const updateA = { status: DepotStatus.INTEGRE, step: DepotStep.CONTROLE_COMPLETED };
      const updateB = { status: DepotStatus.REJETE, step: DepotStep.CONTROLE_IN_PROGRESS };
      const updateC = {
        status: DepotStatus.EN_COURS_DE_TRAITEMENT,
        step: DepotStep.CONTROLE_SANDRE_COMPLETED,
      };
      const updateD = {
        status: DepotStatus.INTEGRE_PARTIELLEMENT,
        step: DepotStep.SEND_TO_AGENCE_DE_L_EAU,
      };

      // We run them concurrently. Pessimistic locking must ensure that one
      // transaction fully completes before the other starts, preventing a "mixed" state
      // where we could have status=INTEGRE but step:CONTROLE_IN_PROGRESS.
      await Promise.all([
        depotGateway.updateDepot(depot.id, updateA),
        depotGateway.updateDepot(depot.id, updateB),
        depotGateway.updateDepot(depot.id, updateC),
        depotGateway.updateDepot(depot.id, updateD),
      ]);

      const updated = await depotGateway.findDepotById(depot.id);

      // The state must match exactly one of the four updates, never a mix.
      const isStateA = updated?.status === updateA.status && updated?.step === updateA.step;
      const isStateB = updated?.status === updateB.status && updated?.step === updateB.step;
      const isStateC = updated?.status === updateC.status && updated?.step === updateC.step;
      const isStateD = updated?.status === updateD.status && updated?.step === updateD.step;

      expect(isStateA || isStateB || isStateC || isStateD).toBe(true);
    });

    // TODO : déplacer dans un autre fichier de test
    it('should update etapeMetier of depot to undefined', async () => {
      const depot = await depotGateway.createDepot({
        nomOriginalFichier: 'depot.xml',
        tailleFichier: 1024,
        type: 'application/xml',
        etapeMetier: EtapeMetier.CONTROLE_REFERENTIEL,
      });

      await depotGateway.updateDepot(depot.id, { etapeMetier: null });

      const updated = await depotGateway.findDepotById(depot.id);
      expect(updated?.etapeMetier).toBeUndefined();
    });
  });
});
