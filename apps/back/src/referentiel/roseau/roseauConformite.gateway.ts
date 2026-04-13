import {
  ConformiteSclDetailRow,
  ConformiteSclFilters,
  ConformiteSclRow,
  ConformiteSteuDetailRow,
  ConformiteSteuFilters,
  ConformiteSteuRow,
} from '@masa/masa.dto';

export interface RoseauConformiteGateway {
  findConformiteSteu(filters: ConformiteSteuFilters): Promise<{ data: ConformiteSteuRow[]; total: number }>;
  findConformiteScl(filters: ConformiteSclFilters): Promise<{ data: ConformiteSclRow[]; total: number }>;
  findConformiteSteuDetail(steuCdn: number, annee: number): Promise<ConformiteSteuDetailRow | null>;
  findConformiteSclDetail(sclCdn: number, annee: number): Promise<ConformiteSclDetailRow | null>;
}

export const RoseauConformiteGateway = Symbol('RoseauConformiteGateway');
