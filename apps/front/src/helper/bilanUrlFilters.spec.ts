import { describe, expect, it } from 'vitest';
import { CURRENT_BILAN_YEAR, FIRST_BILAN_YEAR } from '@lib/dossier';
import {
  buildBilanPageHref,
  parseBilanUrl,
  planBilanNormalization,
  serializeBilanUrl,
  transitionBilanUrl,
  validateBilanUrl,
  DEFAULT_BILAN_FILTER_STATE,
} from './bilanUrlFilters';

const paramsOf = (query: string) => new URLSearchParams(query);

describe('parseBilanUrl', () => {
  it('applies defaults when the URL is empty', () => {
    expect(parseBilanUrl(paramsOf(''))).toEqual({
      ...DEFAULT_BILAN_FILTER_STATE,
      year: CURRENT_BILAN_YEAR,
    });
  });

  it('parses a complete valid SCL URL without losing fields', () => {
    const state = parseBilanUrl(
      paramsOf(
        'mode=scl&year=2026&systemeCollecteCode=SCL001&pointMesureId=42&statut=TP&page=2&sortBy=date&sortOrder=DESC',
      ),
    );

    expect(state).toMatchObject({
      mode: 'scl',
      year: 2026,
      systemeCollecteCode: 'SCL001',
      pointMesureId: '42',
      statut: 'TP',
      page: 2,
      sortBy: 'date',
      sortOrder: 'DESC',
    });
  });

  it('falls back safely on invalid page/sort syntax instead of crashing', () => {
    const state = parseBilanUrl(paramsOf('page=abc&sortBy=nope&sortOrder=SIDEWAYS'));

    expect(state.page).toBe(1);
    expect(state.sortBy).toBeUndefined();
    expect(state.sortOrder).toBeUndefined();
  });

  it('drops incomplete sorting (sortBy without sortOrder)', () => {
    const state = parseBilanUrl(paramsOf('sortBy=date'));

    expect(state.sortBy).toBeUndefined();
    expect(state.sortOrder).toBeUndefined();
  });
});

describe('serializeBilanUrl', () => {
  it('always persists the year, even the current one', () => {
    const serialized = serializeBilanUrl({ ...DEFAULT_BILAN_FILTER_STATE, year: CURRENT_BILAN_YEAR });

    expect(serialized.year).toBe(String(CURRENT_BILAN_YEAR));
  });

  it('omits empty values and default pagination/sorting', () => {
    const serialized = serializeBilanUrl(DEFAULT_BILAN_FILTER_STATE);

    expect(serialized).toMatchObject({
      mode: undefined,
      ouvrageDepollutionCode: undefined,
      page: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
    expect(serialized.year).toBe(String(CURRENT_BILAN_YEAR));
  });

  it('keeps pageSize fixed: never serializes it', () => {
    const serialized = serializeBilanUrl(DEFAULT_BILAN_FILTER_STATE);

    expect(serialized).not.toHaveProperty('pageSize');
  });
});

describe('transitionBilanUrl', () => {
  it('clears incompatible fields and sorting when switching mode', () => {
    const next = transitionBilanUrl(
      {
        ...DEFAULT_BILAN_FILTER_STATE,
        mode: 'scl',
        systemeCollecteCode: 'SCL001',
        pointMesureId: '42',
        statut: 'TP',
        sortBy: 'date',
        sortOrder: 'DESC',
        page: 3,
      },
      { mode: 'steu' },
    );

    expect(next).toMatchObject({
      mode: 'steu',
      systemeCollecteCode: '',
      pointMesureId: '',
      statut: '',
      sortBy: undefined,
      sortOrder: undefined,
      page: 1,
    });
  });

  it('clears the measurement point when the SCL changes', () => {
    const next = transitionBilanUrl(
      { ...DEFAULT_BILAN_FILTER_STATE, mode: 'scl', systemeCollecteCode: 'SCL001', pointMesureId: '42', page: 2 },
      { systemeCollecteCode: 'SCL002' },
    );

    expect(next.pointMesureId).toBe('');
    expect(next.systemeCollecteCode).toBe('SCL002');
    expect(next.page).toBe(1);
  });

  it('clears the parameter when the STEU or the year changes', () => {
    const prev = {
      ...DEFAULT_BILAN_FILTER_STATE,
      ouvrageDepollutionCode: 'STEU001',
      parametreCode: '1313',
      page: 2,
    };

    expect(transitionBilanUrl(prev, { ouvrageDepollutionCode: 'STEU002' }).parametreCode).toBe('');
    expect(transitionBilanUrl(prev, { year: CURRENT_BILAN_YEAR - 1 }).parametreCode).toBe('');
  });

  it('resets pagination on filter and sorting changes but keeps explicit page updates', () => {
    const prev = { ...DEFAULT_BILAN_FILTER_STATE, page: 4 };

    expect(transitionBilanUrl(prev, { statut: 'TP' }).page).toBe(1);
    expect(transitionBilanUrl(prev, { sortBy: 'date', sortOrder: 'DESC' }).page).toBe(1);
    expect(transitionBilanUrl(prev, { page: 3 }).page).toBe(3);
  });

  it('does not clear the parameter when re-selecting the same STEU', () => {
    const prev = { ...DEFAULT_BILAN_FILTER_STATE, ouvrageDepollutionCode: 'STEU001', parametreCode: '1313' };

    expect(transitionBilanUrl(prev, { ouvrageDepollutionCode: 'STEU001' }).parametreCode).toBe('1313');
  });
});

describe('validateBilanUrl', () => {
  it('returns no issue for a valid URL', () => {
    expect(validateBilanUrl(paramsOf('mode=scl&year=2026&systemeCollecteCode=SCL001&statut=TP'))).toEqual([]);
  });

  it('flags unsupported years', () => {
    const issues = validateBilanUrl(paramsOf(`year=${CURRENT_BILAN_YEAR + 5}`));

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ field: 'year', code: 'unsupported-year' });
    expect(issues[0].message).toContain(String(CURRENT_BILAN_YEAR + 5));
  });

  it('accepts supported years', () => {
    expect(validateBilanUrl(paramsOf(`year=${FIRST_BILAN_YEAR}`))).toEqual([]);
  });

  it('flags invalid mode, statut, point and parametre values', () => {
    expect(validateBilanUrl(paramsOf('mode=xyz'))[0]).toMatchObject({ field: 'mode', code: 'invalid-mode' });
    expect(validateBilanUrl(paramsOf('mode=scl&statut=XX'))[0]).toMatchObject({
      field: 'statut',
      code: 'invalid-statut',
    });
    expect(validateBilanUrl(paramsOf('mode=scl&pointMesureId=abc'))[0]).toMatchObject({
      field: 'pointMesureId',
      code: 'invalid-point',
    });
    expect(validateBilanUrl(paramsOf('parametreCode=9999'))[0]).toMatchObject({
      field: 'parametreCode',
      code: 'invalid-parametre',
    });
  });

  it('flags duplicate managed scalar parameters', () => {
    const issues = validateBilanUrl(paramsOf('statut=TP&statut=TS'));

    expect(issues.some((issue) => issue.field === 'statut' && issue.code === 'duplicate')).toBe(true);
  });

  it('ignores opposite-mode fields when the mode is valid', () => {
    expect(validateBilanUrl(paramsOf('mode=steu&statut=XX&pointMesureId=abc'))).toEqual([]);
  });
});

describe('planBilanNormalization', () => {
  it('returns null when nothing needs correction', () => {
    expect(planBilanNormalization(paramsOf('mode=scl&year=2026&systemeCollecteCode=SCL001'))).toBeNull();
  });

  it('restores page 1 with a warning on invalid page syntax', () => {
    const plan = planBilanNormalization(paramsOf('mode=scl&year=2026&page=abc'));

    expect(plan).not.toBeNull();
    expect(plan?.params.get('page')).toBeNull();
    expect(plan?.warnings).toHaveLength(1);
  });

  it('restores default sorting with a warning on invalid sort syntax', () => {
    const plan = planBilanNormalization(paramsOf('sortBy=nope&sortOrder=DESC'));

    expect(plan?.params.get('sortBy')).toBeNull();
    expect(plan?.params.get('sortOrder')).toBeNull();
    expect(plan?.warnings).toHaveLength(1);
  });

  it('removes opposite-mode fields once the mode is valid', () => {
    const plan = planBilanNormalization(paramsOf('mode=steu&year=2026&systemeCollecteCode=SCL001&statut=TP'));

    expect(plan?.params.get('systemeCollecteCode')).toBeNull();
    expect(plan?.params.get('statut')).toBeNull();
    expect(plan?.warnings).toEqual([]);
  });

  it('persists the year in filtered URLs missing it', () => {
    const plan = planBilanNormalization(paramsOf('mode=scl&systemeCollecteCode=SCL001'));

    expect(plan?.params.get('year')).toBe(String(CURRENT_BILAN_YEAR));
  });

  it('leaves invalid filter values untouched for the user to correct', () => {
    const plan = planBilanNormalization(paramsOf('mode=scl&year=2026&statut=XX'));

    expect(plan).toBeNull();
  });
});

describe('buildBilanPageHref', () => {
  it('builds a real filtered URL preserving unrelated params and the fragment', () => {
    const href = buildBilanPageHref(paramsOf('mode=scl&year=2026&foo=bar&page=3'), 2, '#results');

    expect(href).toBe('?mode=scl&year=2026&foo=bar&page=2#results');
  });

  it('omits the page parameter for page 1', () => {
    expect(buildBilanPageHref(paramsOf('year=2026&page=3'), 1)).toBe('?year=2026');
  });
});
