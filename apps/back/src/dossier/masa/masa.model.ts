export enum MasaStatus {
  REFUSE = 'REFUSE',
  INTEGRE = 'INTEGRE',
  INTEGRATION_PARTIELLE = 'INTEGRATION_PARTIELLE',
}

export enum MasaWebhookStatus {
  INITIALISE = 'Initialisé',
  ARCHIVE_ACCEPTE_PARTIELLEMENT = 'Archivé - Accepté partiellement',
  ARCHIVE_NON_ACCEPTE = 'Archivé - Non accepté',
  DEPOSE = 'Déposé',
  REJETE = 'Rejeté',
  INTEGRABLE = 'Intégrable',
  A_INTEGRER = 'A intégrer',
  INTEGRE = 'Intégré',
  ARCHIVE_ACCEPTE = 'Archivé - Accepté',
  ARCHIVE_REJETE = 'Archivé - Rejeté',
  ERREUR_BLOQUANTE = 'Erreur bloquante',
}

export type MasaModel = {
  id: string;
  depotId: string;
  numeroDepotVerseau1: string | null;
  statut: MasaStatus;
  statutMasa: MasaWebhookStatus | null;
  rapport: string | null;
  createdAt: Date;
  updatedAt: Date;
};
