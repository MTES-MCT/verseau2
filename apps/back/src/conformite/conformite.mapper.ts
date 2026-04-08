import type {
  ConformiteSclDetailDto,
  ConformiteSclDto,
  ConformiteSteuDetailDto,
  ConformiteSteuDto,
  PaginatedConformiteSclResponse,
  PaginatedConformiteSteuResponse,
} from '@lib/dossier';
import type {
  ConformiteSclDetailRow,
  ConformiteSclRow,
  ConformiteSteuDetailRow,
  ConformiteSteuRow,
} from '@masa/masa.dto';

type PaginatedRows<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function toConformiteSteuDto(row: ConformiteSteuRow): ConformiteSteuDto {
  return {
    steuCdn: row.steuCdn,
    ouvrageDepollutionCode: row.ouvrageDepollutionCode,
    ouvrageDepollutionNom: row.ouvrageDepollutionNom,
    trancheObligationLibelle: row.trancheObligationLibelle,
    capaciteNominaleEH: row.capaciteNominaleEH,
    suiviDebutDate: row.suiviDebutDate,
    suiviFinDate: row.suiviFinDate,
    conformiteLocaleProvisoire: row.conformiteLocaleProvisoire,
    impactConformite: row.impactConformite,
    suiviRegulierEffectue: row.suiviRegulierEffectue,
    suiviRegulierDate: row.suiviRegulierDate,
  };
}

export function toConformiteSclDto(row: ConformiteSclRow): ConformiteSclDto {
  return {
    sclCdn: row.sclCdn,
    systemeCollecteCode: row.systemeCollecteCode,
    systemeCollecteNom: row.systemeCollecteNom,
    trancheObligationLibelle: row.trancheObligationLibelle,
    typeScl: row.typeScl,
    suiviDebutDate: row.suiviDebutDate,
    suiviFinDate: row.suiviFinDate,
    conformiteLocaleTempsPluieProvisoire: row.conformiteLocaleTempsPluieProvisoire,
    impactConformite: row.impactConformite,
    suiviRegulierEffectue: row.suiviRegulierEffectue,
    suiviRegulierDate: row.suiviRegulierDate,
  };
}

export function toConformiteSteuDetailDto(detail: ConformiteSteuDetailRow): ConformiteSteuDetailDto {
  return {
    conformiteLocaleParametresConformesPeriodeNb: detail.conformiteLocaleParametresConformesPeriodeNb,
    conformiteLocaleParametresConformesAnneeNb: detail.conformiteLocaleParametresConformesAnneeNb,
    conformiteLocaleParametresNonConformesPeriodeNb: detail.conformiteLocaleParametresNonConformesPeriodeNb,
    conformiteLocaleParametresNonConformesAnneeNb: detail.conformiteLocaleParametresNonConformesAnneeNb,
    conformiteLocaleRedhibitoiresPeriodeNb: detail.conformiteLocaleRedhibitoiresPeriodeNb,
    conformiteLocaleRedhibitoiresAnneeNb: detail.conformiteLocaleRedhibitoiresAnneeNb,
    conformiteLocaleParametresConformesPeriodeLb: detail.conformiteLocaleParametresConformesPeriodeLb,
    conformiteLocaleParametresConformesAnneeLb: detail.conformiteLocaleParametresConformesAnneeLb,
    conformiteLocaleParametresNonConformesPeriodeLb: detail.conformiteLocaleParametresNonConformesPeriodeLb,
    conformiteLocaleParametresNonConformesAnneeLb: detail.conformiteLocaleParametresNonConformesAnneeLb,
    conformiteLocaleRedhibitoiresPeriodeLb: detail.conformiteLocaleRedhibitoiresPeriodeLb,
    conformiteLocaleRedhibitoiresAnneeLb: detail.conformiteLocaleRedhibitoiresAnneeLb,
    hcnfPeriodeNb: detail.hcnfPeriodeNb,
    hcnfAnneeNb: detail.hcnfAnneeNb,
    hctsPeriodeNb: detail.hctsPeriodeNb,
    hctsAnneeNb: detail.hctsAnneeNb,
    hcnfPeriodeLb: detail.hcnfPeriodeLb,
    hcnfAnneeLb: detail.hcnfAnneeLb,
    hctsPeriodeLb: detail.hctsPeriodeLb,
    hctsAnneeLb: detail.hctsAnneeLb,
    evenementsPeriodeNb: detail.evenementsPeriodeNb,
    evenementsAnneeNb: detail.evenementsAnneeNb,
  };
}

export function toConformiteSclDetailDto(detail: ConformiteSclDetailRow): ConformiteSclDetailDto {
  return detail;
}

export function toPaginatedConformiteSteuResponse(
  response: PaginatedRows<ConformiteSteuRow>,
): PaginatedConformiteSteuResponse {
  return {
    ...response,
    data: response.data.map(toConformiteSteuDto),
  };
}

export function toPaginatedConformiteSclResponse(
  response: PaginatedRows<ConformiteSclRow>,
): PaginatedConformiteSclResponse {
  return {
    ...response,
    data: response.data.map(toConformiteSclDto),
  };
}
