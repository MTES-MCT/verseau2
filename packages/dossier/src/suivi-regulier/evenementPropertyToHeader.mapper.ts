import type { PropertyToHeaderMapper } from '../shared/propertyToHeader.mapper';
import type { EvenementSclDto, EvenementSteuDto } from './evenement.dto';

export const evenementSteuPropertyToHeaderMapper: PropertyToHeaderMapper<EvenementSteuDto> = [
  { property: 'prisEnCompte', header: 'Pris en compte' },
  { property: 'ouvrageDepollutionCode', header: 'Code Sandre' },
  { property: 'ouvrageDepollutionNom', header: 'Nom' },
  { property: 'date', header: 'Date' },
  { property: 'typeEvenement', header: "Type d'événement" },
  { property: 'finalite', header: 'Finalité' },
  { property: 'commentaire', header: 'Commentaire' },
];

export const evenementSclPropertyToHeaderMapper: PropertyToHeaderMapper<EvenementSclDto> = [
  { property: 'prisEnCompte', header: 'Pris en compte' },
  { property: 'systemeCollecteCode', header: 'Code Sandre' },
  { property: 'systemeCollecteNom', header: 'Nom' },
  { property: 'date', header: 'Date' },
  { property: 'typeEvenement', header: "Type d'événement" },
  { property: 'finalite', header: 'Finalité' },
  { property: 'commentaire', header: 'Commentaire' },
  { property: 'pointMesure', header: 'Point de mesures' },
];
