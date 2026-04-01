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
  const { conformiteNationaleProvisoire: _ignored, ...publicRow } = row;

  return publicRow;
}

export function toConformiteSclDto(row: ConformiteSclRow): ConformiteSclDto {
  const { conformiteNationaleTempsPluieProvisoire: _ignored, ...publicRow } = row;

  return publicRow;
}

export function toConformiteSteuDetailDto(detail: ConformiteSteuDetailRow): ConformiteSteuDetailDto {
  const {
    conformiteNationaleParametresConformesPeriodeNb: _ignoredConformesPeriodeNb,
    conformiteNationaleParametresConformesAnneeNb: _ignoredConformesAnneeNb,
    conformiteNationaleParametresNonConformesPeriodeNb: _ignoredNonConformesPeriodeNb,
    conformiteNationaleParametresNonConformesAnneeNb: _ignoredNonConformesAnneeNb,
    conformiteNationaleRedhibitoiresPeriodeNb: _ignoredRedhibitoiresPeriodeNb,
    conformiteNationaleRedhibitoiresAnneeNb: _ignoredRedhibitoiresAnneeNb,
    conformiteNationaleParametresConformesPeriodeLb: _ignoredConformesPeriodeLb,
    conformiteNationaleParametresConformesAnneeLb: _ignoredConformesAnneeLb,
    conformiteNationaleParametresNonConformesPeriodeLb: _ignoredNonConformesPeriodeLb,
    conformiteNationaleParametresNonConformesAnneeLb: _ignoredNonConformesAnneeLb,
    conformiteNationaleRedhibitoiresPeriodeLb: _ignoredRedhibitoiresPeriodeLb,
    conformiteNationaleRedhibitoiresAnneeLb: _ignoredRedhibitoiresAnneeLb,
    ...publicDetail
  } = detail;

  return publicDetail;
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
