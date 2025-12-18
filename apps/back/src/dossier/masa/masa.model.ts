import { MasaStatus } from './masa.entity';

export class MasaWebhookPayloadDto {
  versau2DepotId: string;
  numeroDepotVerseau1: string;
  statut: MasaStatus;
  rapport: string;
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
