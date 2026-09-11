import {
  ALLOWED_BILAN_STEU_PARAMETRE_CODES,
  BilanSclSortBy,
  BilanSteuSortBy,
  CURRENT_BILAN_YEAR,
  FIRST_BILAN_YEAR,
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

export interface BilanUrlIssue {
  field: string;
  code:
    | 'invalid-mode'
    | 'duplicate'
    | 'unsupported-year'
    | 'invalid-statut'
    | 'invalid-point'
    | 'invalid-parametre';
  message: string;
}

export const BILAN_MANAGED_KEYS = [
  'mode',
  'year',
  'ouvrageDepollutionCode',
  'parametreCode',
  'systemeCollecteCode',
  'pointMesureId',
  'statut',
  'page',
  'sortBy',
  'sortOrder',
] as const;

const STEU_ONLY_KEYS = ['ouvrageDepollutionCode', 'parametreCode'] as const;
const SCL_ONLY_KEYS = ['systemeCollecteCode', 'pointMesureId', 'statut'] as const;

const ALLOWED_PARAMETRE_CODES = new Set(ALLOWED_BILAN_STEU_PARAMETRE_CODES.map(String));

const BILAN_STEU_SORT_VALUES = new Set<string>(BilanSteuSortBy.options);
const BILAN_SCL_SORT_VALUES = new Set<string>(BilanSclSortBy.options);

const getRaw = (params: URLSearchParams, key: string): string | null => {
  const value = params.get(key);
  return value === null ? null : value;
};

const hasDuplicates = (params: URLSearchParams, key: string): boolean => params.getAll(key).length > 1;

const parseRawMode = (params: URLSearchParams): string | null => getRaw(params, 'mode');

export const resolveBilanMode = (params: URLSearchParams): BilanMode =>
  parseRawMode(params) === 'scl' ? 'scl' : 'steu';

const isValidModeValue = (value: string | null): boolean => value === 'steu' || value === 'scl';

const parseYear = (raw: string | null): number | null => {
  if (raw === null || raw.trim() === '') {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
};

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

/** Synchronous parse of the current URL. Invalid values fall back to safe defaults; blocking errors come from validateBilanUrl. */
export function parseBilanUrl(params: URLSearchParams): BilanFilterState {
  const rawMode = parseRawMode(params);
  const mode: BilanMode = rawMode === 'scl' ? 'scl' : 'steu';

  const parsedYear = parseYear(getRaw(params, 'year'));
  const year =
    parsedYear !== null && parsedYear >= FIRST_BILAN_YEAR && parsedYear <= CURRENT_BILAN_YEAR
      ? parsedYear
      : CURRENT_BILAN_YEAR;

  const rawPage = getRaw(params, 'page');
  const parsedPage = rawPage === null || rawPage.trim() === '' ? 1 : Number(rawPage);
  const page = Number.isInteger(parsedPage) && (parsedPage as number) >= 1 ? (parsedPage as number) : 1;

  const sortValues = mode === 'scl' ? BILAN_SCL_SORT_VALUES : BILAN_STEU_SORT_VALUES;
  const rawSortBy = getRaw(params, 'sortBy');
  const rawSortOrder = getRaw(params, 'sortOrder');
  const sortBy =
    rawSortBy !== null && rawSortBy !== '' && sortValues.has(rawSortBy)
      ? (rawSortBy as BilanSortByValue)
      : undefined;
  const sortOrder = rawSortOrder === 'ASC' || rawSortOrder === 'DESC' ? rawSortOrder : undefined;

  const rawStatut = getRaw(params, 'statut');
  const statut: BilanStatut = rawStatut === 'TP' || rawStatut === 'TS' ? rawStatut : '';

  return {
    mode,
    year,
    ouvrageDepollutionCode: (getRaw(params, 'ouvrageDepollutionCode') ?? '').trim(),
    systemeCollecteCode: (getRaw(params, 'systemeCollecteCode') ?? '').trim(),
    pointMesureId: (getRaw(params, 'pointMesureId') ?? '').trim(),
    parametreCode: (getRaw(params, 'parametreCode') ?? '').trim(),
    statut,
    sortBy: sortBy !== undefined && sortOrder !== undefined ? sortBy : undefined,
    sortOrder: sortBy !== undefined && sortOrder !== undefined ? sortOrder : undefined,
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

/**
 * Dependent resets, centralized here so URL loading never replays change handlers:
 * mode switches clear incompatible fields and sorting, SCL changes clear the measurement
 * point, STEU/year changes clear the parameter. Any filter or sorting change resets to page 1.
 */
export function transitionBilanUrl(prev: BilanFilterState, patch: BilanFilterPatch): BilanFilterState {
  const next: BilanFilterState = { ...prev, ...patch };

  if (patch.mode === 'steu') {
    next.pointMesureId = '';
    next.systemeCollecteCode = '';
    next.parametreCode = '';
    next.statut = '';
  } else if (patch.mode === 'scl') {
    next.ouvrageDepollutionCode = '';
    next.parametreCode = '';
  }

  if (patch.mode !== undefined && patch.mode !== prev.mode) {
    next.sortBy = undefined;
    next.sortOrder = undefined;
  }

  if (patch.systemeCollecteCode !== undefined && patch.systemeCollecteCode !== prev.systemeCollecteCode) {
    next.pointMesureId = '';
  }

  if (
    (patch.ouvrageDepollutionCode !== undefined && patch.ouvrageDepollutionCode !== prev.ouvrageDepollutionCode) ||
    (patch.year !== undefined && patch.year !== prev.year)
  ) {
    next.parametreCode = '';
  }

  const patchKeys = Object.keys(patch);
  if (!(patchKeys.length === 1 && patchKeys[0] === 'page')) {
    next.page = 1;
  }

  return next;
}

/** Blocking validation errors: the input stays in the URL, an error is shown, results/export are blocked. */
export function validateBilanUrl(params: URLSearchParams): BilanUrlIssue[] {
  const issues: BilanUrlIssue[] = [];

  for (const key of BILAN_MANAGED_KEYS) {
    if (hasDuplicates(params, key)) {
      issues.push({
        field: key,
        code: 'duplicate',
        message: `Le paramètre « ${key} » est présent plusieurs fois dans l’URL. Corrigez l’URL ou refaites votre sélection.`,
      });
    }
  }

  const rawMode = parseRawMode(params);
  if (rawMode !== null && rawMode !== '' && !isValidModeValue(rawMode)) {
    issues.push({
      field: 'mode',
      code: 'invalid-mode',
      message: `Le type d’ouvrage « ${rawMode} » est invalide. Choisissez STEU ou SCL.`,
    });
  }

  const rawYear = getRaw(params, 'year');
  if (rawYear !== null && rawYear.trim() !== '') {
    const parsed = parseYear(rawYear);
    if (parsed === null || parsed < FIRST_BILAN_YEAR || parsed > CURRENT_BILAN_YEAR) {
      issues.push({
        field: 'year',
        code: 'unsupported-year',
        message: `L’année « ${rawYear.trim()} » n’est pas disponible. Choisissez ${FIRST_BILAN_YEAR} ou ${CURRENT_BILAN_YEAR}.`,
      });
    }
  }

  // Only validate fields relevant to the resolved mode; opposite-mode fields are removed by normalization.
  const mode = resolveBilanMode(params);
  const modeIsValid = rawMode === null || rawMode === '' || isValidModeValue(rawMode);
  if (modeIsValid) {
    if (mode === 'steu') {
      const parametreCode = (getRaw(params, 'parametreCode') ?? '').trim();
      if (parametreCode !== '' && !ALLOWED_PARAMETRE_CODES.has(parametreCode)) {
        issues.push({
          field: 'parametreCode',
          code: 'invalid-parametre',
          message: `Le paramètre « ${parametreCode} » n’est pas autorisé pour les bilans STEU.`,
        });
      }
    } else {
      const statut = getRaw(params, 'statut');
      if (statut !== null && statut !== '' && statut !== 'TP' && statut !== 'TS') {
        issues.push({
          field: 'statut',
          code: 'invalid-statut',
          message: `Le statut « ${statut} » est invalide. Choisissez TP ou TS.`,
        });
      }
      const pointMesureId = (getRaw(params, 'pointMesureId') ?? '').trim();
      if (pointMesureId !== '' && !/^\d+$/.test(pointMesureId)) {
        issues.push({
          field: 'pointMesureId',
          code: 'invalid-point',
          message: `Le point de mesure « ${pointMesureId} » est invalide.`,
        });
      }
    }
  }

  return issues;
}

export interface BilanNormalizationResult {
  params: URLSearchParams;
  warnings: string[];
}

/**
 * Automatic corrections applied via replace (with a surviving warning):
 * invalid page/sort syntax restored to defaults, opposite-mode fields removed once the mode
 * is valid, and the selected year persisted in filtered URLs. Everything else is preserved
 * until the user corrects it.
 */
export function planBilanNormalization(params: URLSearchParams): BilanNormalizationResult | null {
  const next = new URLSearchParams(params.toString());
  const warnings: string[] = [];
  let changed = false;

  const rawPage = getRaw(next, 'page');
  if (rawPage !== null && rawPage.trim() !== '') {
    const parsed = Number(rawPage);
    if (!Number.isInteger(parsed) || parsed < 1) {
      next.delete('page');
      changed = true;
      warnings.push('Le numéro de page demandé est invalide. La page 1 a été restaurée.');
    }
  }

  const rawMode = parseRawMode(next);
  const modeIsValid = rawMode === null || rawMode === '' || isValidModeValue(rawMode);
  const mode: BilanMode = rawMode === 'scl' ? 'scl' : 'steu';
  const sortValues = mode === 'scl' ? BILAN_SCL_SORT_VALUES : BILAN_STEU_SORT_VALUES;
  const rawSortBy = getRaw(next, 'sortBy');
  const rawSortOrder = getRaw(next, 'sortOrder');
  const hasSortBy = rawSortBy !== null && rawSortBy !== '';
  const hasSortOrder = rawSortOrder !== null && rawSortOrder !== '';
  const sortByValid = !hasSortBy || sortValues.has(rawSortBy as string);
  const sortOrderValid = !hasSortOrder || rawSortOrder === 'ASC' || rawSortOrder === 'DESC';
  const sortComplete = (hasSortBy && hasSortOrder) || (!hasSortBy && !hasSortOrder);
  if ((hasSortBy || hasSortOrder) && (!sortByValid || !sortOrderValid || !sortComplete)) {
    next.delete('sortBy');
    next.delete('sortOrder');
    changed = true;
    warnings.push('Le tri demandé est invalide. Le tri par défaut a été restauré.');
  }

  if (modeIsValid) {
    const irrelevant = mode === 'steu' ? SCL_ONLY_KEYS : STEU_ONLY_KEYS;
    for (const key of irrelevant) {
      if (next.has(key)) {
        next.delete(key);
        changed = true;
      }
    }
  }

  const filterKeysPresent = [...STEU_ONLY_KEYS, ...SCL_ONLY_KEYS, 'mode'].some((key) => {
    const value = next.get(key);
    return value !== null && value !== '';
  });
  if (filterKeysPresent) {
    const rawYear = getRaw(next, 'year');
    if (rawYear === null || rawYear.trim() === '') {
      next.delete('year');
      next.append('year', String(CURRENT_BILAN_YEAR));
      changed = true;
    }
  }

  if (!changed) {
    return null;
  }
  return { params: next, warnings };
}

/** Builds a real filtered URL for a pagination link, preserving unrelated params. Keeps the given fragment. */
export function buildBilanPageHref(searchParams: URLSearchParams, page: number, hash = ''): string {
  const next = new URLSearchParams(searchParams.toString());
  next.delete('page');
  if (page > 1) {
    next.append('page', String(page));
  }
  const query = next.toString();
  return `${query ? `?${query}` : ''}${hash}`;
}

export const bilanUrlFilterConfig: UrlFilterConfig<BilanFilterState, BilanFilterPatch> = {
  managedKeys: BILAN_MANAGED_KEYS,
  alwaysPersistKeys: ['year'],
  parse: parseBilanUrl,
  transition: transitionBilanUrl,
  serialize: serializeBilanUrl,
  planNormalization: (params) => planBilanNormalization(params),
};
