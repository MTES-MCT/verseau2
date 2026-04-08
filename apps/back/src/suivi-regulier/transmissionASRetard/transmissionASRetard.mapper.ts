import type { TransmissionASRetardSteuDto, TransmissionASRetardSclDto } from '@lib/dossier';
import type { TransmissionASRetardSteuRow, TransmissionASRetardSclRow } from '@masa/masa.dto';

export function mapTransmissionASRetardSteuRowToDto(row: TransmissionASRetardSteuRow): TransmissionASRetardSteuDto {
  return {
    codeSandre: row.codeSandre,
    nom: row.nom,
    trancheObligation: row.trancheObligation,
    capaciteNominale: row.capaciteNominale,
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
    codeSandre: row.codeSandre,
    nom: row.nom,
    trancheObligation: row.trancheObligation,
    capaciteNominale: row.capaciteNominale,
    nbFichiersAsRecus: row.nbFichiersAsRecus,
    dateDernierFichierRecu: row.dateDernierFichierRecu,
    dateDebutPeriode: row.dateDebutPeriode,
    dateFinPeriode: row.dateFinPeriode,
    dateMesureSuivanteAttendue: row.dateMesureSuivanteAttendue,
    nbJoursRetard: row.nbJoursRetard,
  };
}
