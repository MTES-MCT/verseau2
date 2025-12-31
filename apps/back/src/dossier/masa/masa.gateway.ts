import { MasaModel } from './masa.model';
import { MasaStatus } from './masa.entity';

export interface MasaGateway {
  findById(id: string): Promise<MasaModel | null>;
  findByDepotId(depotId: string): Promise<MasaModel | null>;
  saveMasaRetour(data: {
    depotId: string;
    numeroDepotVerseau1: string;
    statut: MasaStatus;
    rapport: string;
  }): Promise<MasaModel>;
}

export const MasaGateway = Symbol('MasaGateway');
