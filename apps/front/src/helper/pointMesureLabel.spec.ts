import { describe, expect, it } from 'vitest';
import { buildPointMesureLabel } from './pointMesureLabel';

describe('buildPointMesureLabel', () => {
  it('préfixe le libellé avec la localisation globale quand elle diffère du numéro', () => {
    expect(
      buildPointMesureLabel({
        pointMesureId: 120,
        pointMesureNumero: '120',
        pointMesureLibelle: 'DO entrée station',
        pointMesureLocalisationGlobale: 'A3',
      }),
    ).toBe('A3 - 120 - DO entrée station');
  });

  it('ne duplique pas la localisation globale quand elle est identique au numéro', () => {
    expect(
      buildPointMesureLabel({
        pointMesureId: 121,
        pointMesureNumero: 'S10',
        pointMesureLibelle: 'Sable évacué',
        pointMesureLocalisationGlobale: 'S10',
      }),
    ).toBe('S10 - Sable évacué');
  });

  it('ne duplique pas la localisation globale quand elle diffère seulement par la casse', () => {
    expect(
      buildPointMesureLabel({
        pointMesureId: 122,
        pointMesureNumero: 'm1',
        pointMesureLibelle: 'Amont milieu naturel Rhône',
        pointMesureLocalisationGlobale: 'M1',
      }),
    ).toBe('M1 - Amont milieu naturel Rhône');
  });
});
