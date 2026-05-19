import type { PropertyToHeaderMapper } from '../shared/propertyToHeader.mapper';
import type { TransmissionASRetardSclDto, TransmissionASRetardSteuDto } from './transmissionASRetard.dto';

export const transmissionASRetardSteuPropertyToHeaderMapper: PropertyToHeaderMapper<TransmissionASRetardSteuDto> = [
  { property: 'ouvrageDepollutionCode', header: 'Code Sandre' },
  { property: 'ouvrageDepollutionNom', header: 'Nom' },
  { property: 'trancheObligationLibelle', header: "Tranche d'obligation (EH)" },
  { property: 'capaciteNominaleEH', header: 'Capacité nominale (EH)' },
  { property: 'nbFichiersAsRecus', header: 'Nb fichiers AS reçus' },
  { property: 'dateDernierFichierRecu', header: 'Date dernier fichier reçu' },
  { property: 'dateDebutPeriode', header: 'Période début' },
  { property: 'dateFinPeriode', header: 'Période fin' },
  { property: 'dateMesureSuivanteAttendue', header: 'Date attendue' },
  { property: 'nbJoursRetard', header: 'Nb jours de retard' },
];

export const transmissionASRetardSclPropertyToHeaderMapper: PropertyToHeaderMapper<TransmissionASRetardSclDto> = [
  { property: 'systemeCollecteCode', header: 'Code Sandre' },
  { property: 'systemeCollecteNom', header: 'Nom' },
  { property: 'trancheObligationLibelle', header: "Tranche d'obligation (EH)" },
  { property: 'capaciteNominaleEH', header: 'Capacité nominale (EH)' },
  { property: 'nbFichiersAsRecus', header: 'Nb fichiers AS reçus' },
  { property: 'dateDernierFichierRecu', header: 'Date dernier fichier reçu' },
  { property: 'dateDebutPeriode', header: 'Période début' },
  { property: 'dateFinPeriode', header: 'Période fin' },
  { property: 'dateMesureSuivanteAttendue', header: 'Date attendue' },
  { property: 'nbJoursRetard', header: 'Nb jours de retard' },
];
