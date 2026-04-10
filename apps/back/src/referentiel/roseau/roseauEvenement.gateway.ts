import { EvenementSclFilters, EvenementSteuFilters, EvenementSclRow, EvenementSteuRow } from '@masa/masa.dto';

export interface RoseauEvenementGateway {
  findEvenementSteu(filters: EvenementSteuFilters): Promise<{ data: EvenementSteuRow[]; total: number }>;
  findEvenementScl(filters: EvenementSclFilters): Promise<{ data: EvenementSclRow[]; total: number }>;
}

export const RoseauEvenementGateway = Symbol('RoseauEvenementGateway');
