import type { RouteResponse } from '@lib/dossier';
import { listPointsMesure } from '@lib/dossier';

type PointMesureOption = RouteResponse<typeof listPointsMesure>[number];

export function buildPointMesureLabel(pointMesure: PointMesureOption): string {
  const location = pointMesure.pointMesureLocalisationGlobale;
  const number = pointMesure.pointMesureNumero;
  const label = pointMesure.pointMesureLibelle;
  const hasSameLocationAndNumber =
    location !== null && number !== null && location.localeCompare(number, undefined, { sensitivity: 'accent' }) === 0;
  let prefix = '';

  if (location && number && !hasSameLocationAndNumber) {
    prefix = `${location} - ${number}`;
  } else if (location) {
    prefix = location;
  } else if (number) {
    prefix = number;
  }

  if (!prefix) {
    return label ?? '';
  }

  return label ? `${prefix} - ${label}` : prefix;
}
