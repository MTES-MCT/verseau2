import { PointMesureReferentielRow } from '@masa/masa.dto';

export interface RoseauReferentielPointMesureGateway {
  findPointsMesureReferentiel(
    ouvrageType: 'steu' | 'scl',
    ouvrageCode: string,
    filters: { dateDebut?: string; dateFin?: string; localisationCodes?: string[] },
  ): Promise<PointMesureReferentielRow[]>;
}

export const RoseauReferentielPointMesureGateway = Symbol('RoseauReferentielPointMesureGateway');
