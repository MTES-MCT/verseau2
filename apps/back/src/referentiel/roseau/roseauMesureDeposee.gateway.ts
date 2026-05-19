import { MesureFilters, MesureRow } from '@masa/masa.dto';

export interface RoseauMesureDeposeeGateway {
  findMesures(filters: MesureFilters): Promise<{ data: MesureRow[]; total: number }>;
}

export const RoseauMesureDeposeeGateway = Symbol('RoseauMesureDeposeeGateway');
