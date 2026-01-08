import { MasaDto } from '@lib/dossier';
import { MasaModel } from './masa.model';

export const mapMasaModelToDto = (masa: MasaModel): MasaDto => {
  return {
    id: masa.id,
    numeroDepotVerseau1: masa.numeroDepotVerseau1 || null,
    statut: masa.statut,
    rapport: masa.rapport || null,
    createdAt: masa.createdAt,
    updatedAt: masa.updatedAt,
  };
};
