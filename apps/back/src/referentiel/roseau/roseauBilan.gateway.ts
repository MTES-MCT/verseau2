import { BilanSclFilters, BilanSclRow, BilanSteuFilters, BilanSteuRow } from '@masa/masa.dto';

export interface RoseauBilanGateway {
  findBilanSteu(filters: BilanSteuFilters): Promise<{ data: BilanSteuRow[]; total: number }>;
  findBilanScl(filters: BilanSclFilters): Promise<{ data: BilanSclRow[]; total: number }>;
}

export const RoseauBilanGateway = Symbol('RoseauBilanGateway');
