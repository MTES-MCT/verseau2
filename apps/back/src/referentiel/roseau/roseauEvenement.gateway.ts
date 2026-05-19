import {
  EvenementSclFilters,
  EvenementSteuFilters,
  EvenementSclRow,
  EvenementSteuRow,
  NomenclatureItem,
} from '@masa/masa.dto';

export interface RoseauEvenementGateway {
  findEvenementSteu(filters: EvenementSteuFilters): Promise<{ data: EvenementSteuRow[]; total: number }>;
  findEvenementScl(filters: EvenementSclFilters): Promise<{ data: EvenementSclRow[]; total: number }>;
  findEvenementTypes(): Promise<NomenclatureItem[]>;
}

export const RoseauEvenementGateway = Symbol('RoseauEvenementGateway');
