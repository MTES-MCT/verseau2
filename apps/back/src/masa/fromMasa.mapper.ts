import {
  SclCdnBySandreCda,
  SclRef,
  SclWithName,
  SteuCdnBySandreCda,
  SteuRef,
  SteuWithName,
  SystemeCollecte,
} from './masa.dto';

export function mapSteuRefsToSteuCdnBySandreCda(steus: SteuRef[]): SteuCdnBySandreCda[] {
  return steus.map((steu) => ({
    ouvrageDepollutionCode: steu.ouvrageDepollutionCode,
    ouvrageDepollutionId: steu.ouvrageDepollutionId,
  }));
}

export function mapSteuRefsToSteuWithName(steus: SteuRef[]): SteuWithName[] {
  return steus.map((steu) => ({
    ouvrageDepollutionCode: steu.ouvrageDepollutionCode,
    ouvrageDepollutionNom: steu.ouvrageDepollutionNom,
  }));
}

export function mapSclRefsToSystemeCollecte(scls: SclRef[]): SystemeCollecte | null {
  const scl = scls[0];
  if (!scl) return null;

  return {
    systemeCollecteId: scl.systemeCollecteId,
    systemeCollecteCode: scl.systemeCollecteCode,
    systemeCollecteNom: scl.systemeCollecteNom,
  };
}

export function mapSclRefsToSclCdnBySandreCda(scls: SclRef[]): SclCdnBySandreCda[] {
  return scls.map((scl) => ({
    systemeCollecteCode: scl.systemeCollecteCode,
    systemeCollecteId: scl.systemeCollecteId,
  }));
}

export function mapSclRefsToSclWithName(scls: SclRef[]): SclWithName[] {
  return scls.map((scl) => ({
    systemeCollecteCode: scl.systemeCollecteCode,
    systemeCollecteNom: scl.systemeCollecteNom,
  }));
}
