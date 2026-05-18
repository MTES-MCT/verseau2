import type { MesureDto } from './mesure.dto';

export function buildPointDeMesure(mesure: MesureDto): string {
  const parts: string[] = [];

  if (mesure.pointMesureLibelle) {
    parts.push(mesure.pointMesureLibelle);
  }
  if (mesure.pointMesureNumero) {
    parts.push(`n°${mesure.pointMesureNumero}`);
  }
  if (mesure.pointAgenceEauNumero) {
    parts.push(`(${mesure.pointAgenceEauNumero})`);
  }

  return parts.join(' ') || '-';
}
