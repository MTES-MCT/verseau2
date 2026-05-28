import { MasaModel } from './masa.model';
import { MasaStatus, MasaWebhookStatus } from './masa.model';
export interface MasaGateway {
  findById(id: string): Promise<MasaModel | null>;
  findByDepotId(depotId: string): Promise<MasaModel | null>;
  saveMasaRetour(data: {
    depotId: string;
    numeroDepotVerseau1: string | null;
    statut: MasaStatus;
    statutMasa: MasaWebhookStatus;
    rapport: string;
  }): Promise<MasaModel>;
}

export const MasaGateway = Symbol('MasaGateway');
