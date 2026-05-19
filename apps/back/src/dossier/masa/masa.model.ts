export enum MasaStatus {
  REFUSE = 'REFUSE',
  INTEGRE = 'INTEGRE',
  INTEGRATION_PARTIELLE = 'INTEGRATION_PARTIELLE',
}

export type MasaModel = {
  id: string;
  depotId: string;
  numeroDepotVerseau1: string;
  statut: MasaStatus;
  rapport: string;
  createdAt: Date;
  updatedAt: Date;
};
