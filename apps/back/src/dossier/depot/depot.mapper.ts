import { Injectable } from '@nestjs/common';
import { DepotModel } from './depot.model';
import { DepotDto } from '@lib/dossier';
@Injectable()
export class DepotMapper {
  constructor() {}

  mapDepotEntityToDepotDto(depotModel: DepotModel): DepotDto {
    return {
      id: depotModel.id,
      numeroDepotVerseau1: depotModel.masa?.numeroDepotVerseau1,
      nomOriginalFichier: depotModel.nomOriginalFichier,
      step: depotModel.step,
      status: depotModel.status,
      rapportPath: depotModel.rapportPath,
      createdAt: depotModel.createdAt,
      updatedAt: depotModel.updatedAt,
    };
  }
}
