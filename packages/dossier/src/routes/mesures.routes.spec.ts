import { exportMesures, graphMesures, listMesures } from './mesures.routes';

const STEU_QUERY = {
  ouvrageType: 'steu' as const,
  ouvrageCode: 'STEU001',
  dateDebut: '2024-01-01',
  dateFin: '2024-12-31',
};

const SCL_QUERY = {
  ouvrageType: 'scl' as const,
  ouvrageCode: 'SCL001',
  dateDebut: '2024-01-01',
  dateFin: '2024-12-31',
};

describe('mesures query contract', () => {
  describe.each([
    ['listMesures', listMesures],
    ['graphMesures', graphMesures],
    ['exportMesures', exportMesures],
  ])('%s', (_name, route) => {
    it('accepts a STEU query with a station and a period', () => {
      const result = route.query.safeParse(STEU_QUERY);

      expect(result.success).toBe(true);
    });

    it('accepts an SCL query with a system and a period', () => {
      const result = route.query.safeParse(SCL_QUERY);

      expect(result.success).toBe(true);
    });

    describe.each([STEU_QUERY, SCL_QUERY])('$ouvrageType', (query) => {
      it('trims the single ouvrage code without converting it to an array', () => {
        const result = route.query.parse({ ...query, ouvrageCode: ` ${query.ouvrageCode} ` });

        expect(result.ouvrageCode).toBe(query.ouvrageCode);
      });

      it.each(['0456018S0001', '035162901000', '0546193V001', 'FERM01S0001', 'A'.repeat(16)])(
        'accepts an ouvrage code up to 16 characters: %s',
        (ouvrageCode) => {
          const result = route.query.parse({ ...query, ouvrageCode });

          expect(result.ouvrageCode).toBe(ouvrageCode);
        },
      );

      it('checks the maximum ouvrage code length after trimming', () => {
        const ouvrageCode = 'A'.repeat(16);
        const result = route.query.parse({ ...query, ouvrageCode: ` ${ouvrageCode}   ` });

        expect(result.ouvrageCode).toBe(ouvrageCode);
      });

      it('rejects an ouvrage code longer than 16 characters after trimming', () => {
        const result = route.query.safeParse({ ...query, ouvrageCode: ` ${'A'.repeat(17)} ` });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toContainEqual(
          expect.objectContaining({ code: 'too_big', path: ['ouvrageCode'], maximum: 16 }),
        );
      });

      it.each([undefined, null, '', '   ', [], ['CODE001'], ['CODE001', 'CODE002'], 123])(
        'rejects an invalid ouvrage code: %j',
        (ouvrageCode) => {
          const result = route.query.safeParse({ ...query, ouvrageCode });

          expect(result.success).toBe(false);
        },
      );
    });

    it('does not use the legacy station lists as a fallback', () => {
      const result = route.query.safeParse({
        ...STEU_QUERY,
        ouvrageCode: undefined,
        steuSandreCdas: ['STEU001'],
        sclSandreCdas: ['SCL001'],
      });

      expect(result.success).toBe(false);
    });

    it('rejects a query without a period', () => {
      const result = route.query.safeParse({ ...STEU_QUERY, dateDebut: undefined, dateFin: undefined });

      expect(result.success).toBe(false);
    });

    it('rejects a non ISO period', () => {
      const result = route.query.safeParse({ ...STEU_QUERY, dateDebut: '01/01/2024' });

      expect(result.success).toBe(false);
    });

    it('rejects an inverted period', () => {
      const result = route.query.safeParse({ ...STEU_QUERY, dateDebut: '2024-12-31', dateFin: '2024-01-01' });

      expect(result.success).toBe(false);
    });
  });

  it('keeps the same query contract for the list, graph and export routes', () => {
    expect(graphMesures.query).toBe(listMesures.query);
    expect(exportMesures.query).toBe(listMesures.query);
  });
});
