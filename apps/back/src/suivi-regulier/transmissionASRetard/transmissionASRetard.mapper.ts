import type { TransmissionASRetardSteuDto, TransmissionASRetardSclDto } from '@lib/dossier';
import type { TransmissionASRetardSteuRow, TransmissionASRetardSclRow } from '@masa/masa.dto';

export function mapTransmissionASRetardSteuRowToDto(row: TransmissionASRetardSteuRow): TransmissionASRetardSteuDto {
  return {
    ouvrageDepollutionCode: row.ouvrageDepollutionCode,
    ouvrageDepollutionNom: row.ouvrageDepollutionNom,
    trancheObligationLibelle: row.trancheObligationLibelle,
    capaciteNominaleEH: row.capaciteNominaleEH,
    nbFichiersAsRecus: row.nbFichiersAsRecus,
    dateDernierFichierRecu: row.dateDernierFichierRecu,
    dateDebutPeriode: row.dateDebutPeriode,
    dateFinPeriode: row.dateFinPeriode,
    dateMesureSuivanteAttendue: row.dateMesureSuivanteAttendue,
    nbJoursRetard: row.nbJoursRetard,
  };
}

export function mapTransmissionASRetardSclRowToDto(row: TransmissionASRetardSclRow): TransmissionASRetardSclDto {
  return {
    systemeCollecteCode: row.systemeCollecteCode,
    systemeCollecteNom: row.systemeCollecteNom,
    trancheObligationLibelle: row.trancheObligationLibelle,
    capaciteNominaleEH: row.capaciteNominaleEH,
    nbFichiersAsRecus: row.nbFichiersAsRecus,
    dateDernierFichierRecu: row.dateDernierFichierRecu,
    dateDebutPeriode: row.dateDebutPeriode,
    dateFinPeriode: row.dateFinPeriode,
    dateMesureSuivanteAttendue: row.dateMesureSuivanteAttendue,
    nbJoursRetard: row.nbJoursRetard,
  };
}
