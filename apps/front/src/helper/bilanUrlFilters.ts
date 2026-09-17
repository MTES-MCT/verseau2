import {
  ALLOWED_BILAN_STEU_PARAMETRE_CODES,
  BilanSclSortBy,
  BilanSteuSortBy,
  CURRENT_BILAN_YEAR,
  type BilanSclSortByValue,
  type BilanSteuSortByValue,
} from '@lib/dossier';
import type { UrlFilterConfig } from '../hooks/useUrlFilters';

export const BILAN_PAGE_SIZE = 20;

export type BilanMode = 'steu' | 'scl';
export type BilanSortByValue = BilanSteuSortByValue | BilanSclSortByValue;
export type BilanStatut = 'TP' | 'TS' | '';

export interface BilanFilterState {
  mode: BilanMode;
  year: number;
  ouvrageDepollutionCode: string;
  systemeCollecteCode: string;
  pointMesureId: string;
  parametreCode: string;
  statut: BilanStatut;
  sortBy?: BilanSortByValue;
  sortOrder?: 'ASC' | 'DESC';
  page: number;
}

export type BilanFilterPatch = Partial<BilanFilterState>;

const ALLOWED_PARAMETRE_CODES = new Set(ALLOWED_BILAN_STEU_PARAMETRE_CODES.map(String));

export const DEFAULT_BILAN_FILTER_STATE: BilanFilterState = {
  mode: 'steu',
  year: CURRENT_BILAN_YEAR,
  ouvrageDepollutionCode: '',
  systemeCollecteCode: '',
  pointMesureId: '',
  parametreCode: '',
  statut: '',
  sortBy: undefined,
  sortOrder: undefined,
  page: 1,
};

/**
 * The first occurrence of each scalar wins. Missing/invalid values use defaults;
 * numeric years outside the available range stay selected for an explicit year error.
 * Parsing never navigates: duplicates and irrelevant fields are removed on the next write.
 */
export function parseBilanUrl(params: URLSearchParams): BilanFilterState {
  const mode = params.get('mode') === 'scl' ? 'scl' : 'steu';
  const rawYear = params.get('year')?.trim();
  const year = rawYear && Number.isSafeInteger(Number(rawYear)) ? Number(rawYear) : CURRENT_BILAN_YEAR;
  const parsedPage = Number(params.get('page'));
  const page = Number.isSafeInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const sortSchema = mode === 'scl' ? BilanSclSortBy : BilanSteuSortBy;
  const parsedSort = sortSchema.safeParse(params.get('sortBy'));
  const rawSortOrder = params.get('sortOrder');
  const hasSort = parsedSort.success && (rawSortOrder === 'ASC' || rawSortOrder === 'DESC');
  const rawStatut = params.get('statut');
  const pointMesureId = params.get('pointMesureId')?.trim() ?? '';
  const parametreCode = params.get('parametreCode')?.trim() ?? '';

  return {
    mode,
    year,
    ouvrageDepollutionCode: mode === 'steu' ? (params.get('ouvrageDepollutionCode') ?? '').trim() : '',
    systemeCollecteCode: mode === 'scl' ? (params.get('systemeCollecteCode') ?? '').trim() : '',
    pointMesureId:
      mode === 'scl' && /^\d+$/.test(pointMesureId) && Number.isSafeInteger(Number(pointMesureId)) ? pointMesureId : '',
    parametreCode: mode === 'steu' && ALLOWED_PARAMETRE_CODES.has(parametreCode) ? parametreCode : '',
    statut: mode === 'scl' && (rawStatut === 'TP' || rawStatut === 'TS') ? rawStatut : '',
    sortBy: hasSort ? parsedSort.data : undefined,
    sortOrder: hasSort ? rawSortOrder : undefined,
    page,
  };
}

export function serializeBilanUrl(state: BilanFilterState): Record<string, string | undefined> {
  return {
    mode: state.mode === 'scl' ? 'scl' : undefined,
    year: String(state.year),
    ouvrageDepollutionCode: state.ouvrageDepollutionCode || undefined,
    parametreCode: state.parametreCode || undefined,
    systemeCollecteCode: state.systemeCollecteCode || undefined,
    pointMesureId: state.pointMesureId || undefined,
    statut: state.statut || undefined,
    page: state.page > 1 ? String(state.page) : undefined,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
  };
}

/** Builds a real filtered pagination URL, preserving unrelated params and the fragment. */
export function buildBilanPageHref(searchParams: URLSearchParams, page: number, hash = ''): string {
  const next = new URLSearchParams(searchParams);
  const values = serializeBilanUrl({ ...parseBilanUrl(searchParams), page });
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  return `?${next.toString()}${hash}`;
}

export const bilanUrlFilterConfig: UrlFilterConfig<BilanFilterState> = {
  keys: Object.keys(serializeBilanUrl(DEFAULT_BILAN_FILTER_STATE)),
  parse: parseBilanUrl,
  serialize: serializeBilanUrl,
};
