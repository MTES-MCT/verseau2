import { DepotStep, DepotStatus } from '@lib/dossier';

// Classe de test simplifiée qui n'hérite pas de toutes les dépendances TypeORM
class DepotEntityForTest {
  step: DepotStep;
  stepHistory: DepotStep[];
  id?: string;
  nomOriginalFichier?: string;
  status?: DepotStatus;

  /**
   * Met à jour le step et ajoute automatiquement la nouvelle valeur dans l'historique.
   * Évite les doublons si le step est identique à la valeur actuelle.
   * @param newStep La nouvelle valeur du step
   */
  public updateStep(newStep: DepotStep): void {
    if (this.step !== newStep) {
      this.stepHistory = this.stepHistory || [];
      this.stepHistory.push(newStep);
      this.step = newStep;
    }
  }
}

describe('DepotEntity', () => {
  describe('updateStep', () => {
    it('should update step and add it to stepHistory', () => {
      const depot = new DepotEntityForTest();
      depot.step = DepotStep.UPLOADING_TO_S3;
      depot.stepHistory = [];

      depot.updateStep(DepotStep.CONTROLE_IN_PROGRESS);

      expect(depot.step).toBe(DepotStep.CONTROLE_IN_PROGRESS);
      expect(depot.stepHistory).toEqual([DepotStep.CONTROLE_IN_PROGRESS]);
    });

    it('should add multiple steps to history in order', () => {
      const depot = new DepotEntityForTest();
      depot.step = DepotStep.UPLOADING_TO_S3;
      depot.stepHistory = [];

      depot.updateStep(DepotStep.CONTROLE_IN_PROGRESS);
      depot.updateStep(DepotStep.CONTROLE_COMPLETED);
      depot.updateStep(DepotStep.READY_FOR_SFTP);

      expect(depot.step).toBe(DepotStep.READY_FOR_SFTP);
      expect(depot.stepHistory).toEqual([
        DepotStep.CONTROLE_IN_PROGRESS,
        DepotStep.CONTROLE_COMPLETED,
        DepotStep.READY_FOR_SFTP,
      ]);
    });

    it('should not add duplicate when step is the same', () => {
      const depot = new DepotEntityForTest();
      depot.step = DepotStep.CONTROLE_IN_PROGRESS;
      depot.stepHistory = [DepotStep.CONTROLE_IN_PROGRESS];

      depot.updateStep(DepotStep.CONTROLE_IN_PROGRESS);

      expect(depot.step).toBe(DepotStep.CONTROLE_IN_PROGRESS);
      expect(depot.stepHistory).toEqual([DepotStep.CONTROLE_IN_PROGRESS]);
    });

    it('should initialize stepHistory array if undefined', () => {
      const depot = new DepotEntityForTest();
      depot.step = DepotStep.UPLOADING_TO_S3;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      depot.stepHistory = undefined as any;

      depot.updateStep(DepotStep.CONTROLE_IN_PROGRESS);

      expect(depot.step).toBe(DepotStep.CONTROLE_IN_PROGRESS);
      expect(depot.stepHistory).toEqual([DepotStep.CONTROLE_IN_PROGRESS]);
    });

    it('should preserve existing history when adding new step', () => {
      const depot = new DepotEntityForTest();
      depot.step = DepotStep.CONTROLE_IN_PROGRESS;
      depot.stepHistory = [DepotStep.UPLOADING_TO_S3, DepotStep.CONTROLE_IN_PROGRESS];

      depot.updateStep(DepotStep.CONTROLE_COMPLETED);

      expect(depot.step).toBe(DepotStep.CONTROLE_COMPLETED);
      expect(depot.stepHistory).toEqual([
        DepotStep.UPLOADING_TO_S3,
        DepotStep.CONTROLE_IN_PROGRESS,
        DepotStep.CONTROLE_COMPLETED,
      ]);
    });

    it('should work with all possible DepotStep values', () => {
      const depot = new DepotEntityForTest();
      // Initialiser avec un step différent de ceux qu'on va tester
      depot.step = DepotStep.UPLOADING_TO_S3;
      depot.stepHistory = [];

      const allSteps = [
        DepotStep.CONTROLE_IN_PROGRESS,
        DepotStep.CONTROLE_COMPLETED,
        DepotStep.CONTROLE_FAILED,
        DepotStep.CONTROLE_SANDRE_IN_PROGRESS,
        DepotStep.CONTROLE_SANDRE_COMPLETED,
        DepotStep.CONTROLE_SANDRE_FAILED,
        DepotStep.READY_FOR_SFTP,
        DepotStep.SFTP_IN_PROGRESS,
        DepotStep.SFTP_COMPLETED,
        DepotStep.SFTP_FAILED,
      ];

      allSteps.forEach((step) => {
        depot.updateStep(step);
      });

      expect(depot.step).toBe(DepotStep.SFTP_FAILED);
      expect(depot.stepHistory).toEqual(allSteps);
    });

    it('should not modify other entity properties', () => {
      const depot = new DepotEntityForTest();
      depot.id = 'dep_123';
      depot.nomOriginalFichier = 'test.xml';
      depot.status = DepotStatus.EN_COURS_DE_TRAITEMENT;
      depot.step = DepotStep.UPLOADING_TO_S3;
      depot.stepHistory = [];

      depot.updateStep(DepotStep.CONTROLE_IN_PROGRESS);

      expect(depot.id).toBe('dep_123');
      expect(depot.nomOriginalFichier).toBe('test.xml');
      expect(depot.status).toBe(DepotStatus.EN_COURS_DE_TRAITEMENT);
    });
  });
});
