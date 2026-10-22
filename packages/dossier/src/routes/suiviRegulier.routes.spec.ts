import { listEvenementPmo } from './suiviRegulier.routes';

describe('listEvenementPmo response contract', () => {
  const pointMesure = {
    pointMesureId: 9001,
    pointMesureNumero: '1',
    pointMesureLibelle: null,
    pointMesureLocalisationGlobale: 'A2',
  };

  it('preserves measurement points grouped by collection system identifier', () => {
    const response = {
      '501': [pointMesure, { ...pointMesure, pointMesureId: 9002 }],
      '502': [{ ...pointMesure, pointMesureId: 9003, pointMesureLocalisationGlobale: null }],
    };

    expect(listEvenementPmo.response.parse(response)).toEqual(response);
  });

  it('accepts an empty object', () => {
    expect(listEvenementPmo.response.parse({})).toEqual({});
  });

  it.each([[], [pointMesure], { '501': pointMesure }, { '501': [null] }])(
    'rejects an invalid response: %j',
    (response) => {
      expect(listEvenementPmo.response.safeParse(response).success).toBe(false);
    },
  );
});
