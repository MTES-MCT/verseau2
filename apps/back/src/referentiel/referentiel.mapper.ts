import type { IntervenantDetailDto, RouteResponse } from '@lib/dossier';
import { getSclDetail, getSteuDetail } from '@lib/dossier';
import type { OuvrageIntervenantRole, OuvrageIntervenantRow, SclDetailRow, SteuDetailRow } from '@masa/masa.dto';

export function mapIntervenantsByRole(
  intervenants: OuvrageIntervenantRow[],
  role: OuvrageIntervenantRole,
): IntervenantDetailDto[] {
  return intervenants
    .filter((intervenant) => intervenant.role === role)
    .map(({ intervenantNom, intervenantSiret }) => ({ intervenantNom, intervenantSiret }));
}

export function toSteuDetailResponse(detail: SteuDetailRow): RouteResponse<typeof getSteuDetail> {
  return {
    ouvrageDepollutionCode: detail.ouvrageDepollutionCode,
    dateMiseEnService: detail.dateMiseEnService,
    exploitants: mapIntervenantsByRole(detail.intervenants, 'exploitant'),
    maitresOuvrage: mapIntervenantsByRole(detail.intervenants, 'maitre_ouvrage'),
  };
}

export function toSclDetailResponse(detail: SclDetailRow): RouteResponse<typeof getSclDetail> {
  return {
    systemeCollecteCode: detail.systemeCollecteCode,
    exploitants: mapIntervenantsByRole(detail.intervenants, 'exploitant'),
    maitresOuvrage: mapIntervenantsByRole(detail.intervenants, 'maitre_ouvrage'),
  };
}
