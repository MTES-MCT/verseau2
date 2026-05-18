import type { PropertyToHeaderMapper } from '../shared/propertyToHeader.mapper';
import type { MesureDto } from './mesure.dto';

export const mesurePropertyToHeaderMapper: PropertyToHeaderMapper<MesureDto> = [
  { property: 'prelevementDate', header: 'Date' },
  { property: 'pointMesure', header: 'Point de mesure' },
  { property: 'pointMesureLocalisationCode', header: 'Localisation' },
  { property: 'parametre', header: 'Paramètre' },
  { property: 'resultatAnalyseValeur', header: 'Valeur' },
  { property: 'uniteMesureSymbole', header: 'Unité' },
  { property: 'resultatAnalyseQualification', header: 'Qualification' },
  { property: 'analyseFinalite', header: 'Finalité' },
  { property: 'resultatAnalyseStatut', header: 'Statut' },
];
