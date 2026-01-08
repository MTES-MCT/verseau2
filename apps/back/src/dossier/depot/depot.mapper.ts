import { DepotEntity } from './depot.entity';
import { DepotModel } from './depot.model';
import { DepotDto } from '@lib/dossier';

export const mapDepotEntityToDepotDto = (depotModel: DepotModel): DepotDto => {
  return {
    id: depotModel.id,
    numeroDepotVerseau1: depotModel.masa?.numeroDepotVerseau1,
    nomOriginalFichier: depotModel.nomOriginalFichier,
    status: depotModel.status,
    etapeMetier: depotModel.etapeMetier,
    rapportPath: depotModel.rapportPath,
    createdAt: depotModel.createdAt,
    updatedAt: depotModel.updatedAt,
  };
};

export const mapDepotEntityToModel = (depotEntity: DepotEntity): DepotModel => {
  return { ...depotEntity, etapeMetier: depotEntity.etapeMetier ?? undefined };
};
