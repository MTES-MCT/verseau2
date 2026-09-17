import { describe, expect, it } from 'vitest';
import { CURRENT_BILAN_YEAR } from '@lib/dossier';
import { buildBilanPageHref, parseBilanUrl, serializeBilanUrl, DEFAULT_BILAN_FILTER_STATE } from './bilanUrlFilters';

const parse = (query: string) => parseBilanUrl(new URLSearchParams(query));

describe('parseBilanUrl', () => {
  it('uses defaults for missing values', () => {
    expect(parse('')).toEqual(DEFAULT_BILAN_FILTER_STATE);
  });

  it('parses a complete SCL deep link without replaying resets', () => {
    expect(
      parse(
        'mode=scl&year=2026&systemeCollecteCode=SCL001&pointMesureId=42&statut=TP&page=2&sortBy=date&sortOrder=DESC',
      ),
    ).toEqual({
      ...DEFAULT_BILAN_FILTER_STATE,
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

  it.each(['abc', '-1', '0', '1.5', 'Infinity', '9007199254740992'])('defaults invalid page %s', (page) => {
    expect(parse(`page=${page}`).page).toBe(1);
  });

  it.each(['sortBy=nope&sortOrder=DESC', 'sortBy=date', 'sortOrder=ASC', 'sortBy=date&sortOrder=SIDEWAYS'])(
    'defaults invalid or incomplete sorting: %s',
    (query) => {
      expect(parse(query)).toMatchObject({ sortBy: undefined, sortOrder: undefined });
    },
  );

  it('uses only sorting valid for the selected mode', () => {
    expect(parse('mode=scl&sortBy=parametreNom&sortOrder=ASC').sortBy).toBeUndefined();
    expect(parse('sortBy=parametreNom&sortOrder=ASC').sortBy).toBe('parametreNom');
  });

  it('uses defaults for invalid mode, status, point and parameter values', () => {
    expect(parse('mode=xyz').mode).toBe('steu');
    expect(parse('mode=scl&statut=XX&pointMesureId=abc')).toMatchObject({ statut: '', pointMesureId: '' });
    expect(parse('parametreCode=9999').parametreCode).toBe('');
  });

  it('ignores fields belonging to the other mode', () => {
    expect(parse('mode=steu&systemeCollecteCode=SCL001&pointMesureId=7&statut=TP')).toMatchObject({
      systemeCollecteCode: '',
      pointMesureId: '',
      statut: '',
    });
    expect(parse('mode=scl&ouvrageDepollutionCode=STEU001&parametreCode=1313')).toMatchObject({
      ouvrageDepollutionCode: '',
      parametreCode: '',
    });
  });

  it('uses the first occurrence of duplicate scalars, even if it is invalid', () => {
    expect(parse('mode=scl&statut=TP&statut=TS&year=1999&year=2026')).toMatchObject({ statut: 'TP', year: 1999 });
    expect(parse('mode=xyz&mode=scl').mode).toBe('steu');
  });

  it('preserves unavailable numeric years and defaults malformed years', () => {
    expect(parse('year=1999').year).toBe(1999);
    expect(parse(`year=${CURRENT_BILAN_YEAR + 1}`).year).toBe(CURRENT_BILAN_YEAR + 1);
    expect(parse('year=abc').year).toBe(CURRENT_BILAN_YEAR);
  });
});

describe('serializeBilanUrl', () => {
  it('persists the year and omits empty filters and default pagination/sorting', () => {
    expect(serializeBilanUrl(DEFAULT_BILAN_FILTER_STATE)).toEqual({
      mode: undefined,
      year: String(CURRENT_BILAN_YEAR),
      ouvrageDepollutionCode: undefined,
      parametreCode: undefined,
      systemeCollecteCode: undefined,
      pointMesureId: undefined,
      statut: undefined,
      page: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
  });

  it('round trips a complete STEU link', () => {
    const state = parse(
      'year=2026&ouvrageDepollutionCode=STEU001&parametreCode=1313&page=2&sortBy=date&sortOrder=DESC',
    );
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(serializeBilanUrl(state))) {
      if (value !== undefined) {
        params.set(key, value);
      }
    }
    expect(parseBilanUrl(params)).toEqual(state);
  });
});

describe('buildBilanPageHref', () => {
  it('preserves unrelated parameters and the fragment', () => {
    expect(buildBilanPageHref(new URLSearchParams('mode=scl&year=2026&foo=bar&page=3'), 2, '#results')).toBe(
      '?mode=scl&year=2026&foo=bar&page=2#results',
    );
  });

  it('omits page 1 and collapses duplicate owned parameters', () => {
    expect(buildBilanPageHref(new URLSearchParams('year=1999&year=2026&page=3'), 1)).toBe('?year=1999');
  });

  it('persists the default year when writing a pagination URL', () => {
    expect(buildBilanPageHref(new URLSearchParams(), 2)).toBe(`?year=${CURRENT_BILAN_YEAR}&page=2`);
  });
});
