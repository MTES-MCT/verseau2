import type { PropertyToHeaderMapper } from '../shared/propertyToHeader.mapper';
import type { BilanSclDto, BilanSteuDto } from './bilan.dto';

export const bilanSteuPropertyToHeaderMapper: PropertyToHeaderMapper<BilanSteuDto> = [
  { property: 'bilanEcarteParSpe', header: 'Bilan écarté par le SPE (A)' },
  { property: 'date', header: 'Date' },
  { property: 'parametreNom', header: 'Paramètre' },
  { property: 'hcnf', header: 'HCNF' },
  { property: 'evt', header: 'Evt' },
  { property: 'finalite', header: 'Finalité' },
];

export const bilanSclPropertyToHeaderMapper: PropertyToHeaderMapper<BilanSclDto> = [
  { property: 'systemeCollecteNom', header: 'Nom' },
  { property: 'pointMesureNumero', header: 'Point de mesure' },
  { property: 'date', header: 'Date' },
  { property: 'volumeDeverse', header: 'Volume déversé (m³)' },
  { property: 'tempsDeversement', header: 'Temps de déversement (h)' },
  { property: 'statut', header: 'Statut (TP ou TS)' },
];
