import { MasaModel } from './masa.model';
import { MasaStatus } from './masa.entity';

export interface MasaGateway {
  saveMasaRetour(data: {
    depotId: string;
    numeroDepotVerseau1: string;
    statut: MasaStatus;
    rapport: string;
  }): Promise<MasaModel>;
}

export const MasaGateway = Symbol('MasaGateway');
