import type { ControleSandreDto } from '@lib/dossier';
import type { ReponseSandreModel } from './reponseSandre.model';

export const mapReponseSandreModelToDto = (reponse: ReponseSandreModel): ControleSandreDto => ({
  id: reponse.id,
  acceptationStatus: reponse.acceptationStatus,
  isConformant: reponse.isConformant,
  errors: reponse.errors?.map((error) => ({
    code: error.code,
    message: error.message,
    location: error.location,
    ligne: error.ligne,
    colonne: error.colonne,
    severite: error.severite,
  })),
  createdAt: reponse.createdAt,
  updatedAt: reponse.updatedAt,
});
