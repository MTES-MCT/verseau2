import { Injectable } from '@nestjs/common';
import { BilanSteuSortByValue, BilanSclSortByValue, PaginationQuery } from '@lib/dossier';
import { MasaProvider } from '@masa/masa.provider';
import type { BilanSteuFilters, BilanSclFilters } from '@masa/masa.dto';

export interface ListBilanSteuOptions extends PaginationQuery {
  authorizedSteuCdas: string[];
  year: number;
  ouvrageDepollutionCode?: string;
  sortBy?: BilanSteuSortByValue;
}

export interface ListBilanSclOptions extends PaginationQuery {
  authorizedSclCdas: string[];
  year: number;
  systemeCollecteCode?: string;
  pointMesureId?: number;
  statut?: 'TP' | 'TS';
  sortBy?: BilanSclSortByValue;
}

@Injectable()
export class BilanService {
  constructor(private readonly masaProvider: MasaProvider) {}

  async listBilanSteu(options: ListBilanSteuOptions) {
    const { authorizedSteuCdas, year, ouvrageDepollutionCode, page, pageSize, sortBy, sortOrder } = options;
    const cdasToQuery = ouvrageDepollutionCode
      ? [ouvrageDepollutionCode].filter((code) => authorizedSteuCdas.includes(code))
      : authorizedSteuCdas;

    if (cdasToQuery.length === 0 && ouvrageDepollutionCode) {
      return { data: [], total: 0, page, pageSize };
    }

    const ouvrageDepollutionIds = await this.resolveAuthorizedSteuCdns(cdasToQuery);
    if (ouvrageDepollutionIds.length === 0) return { data: [], total: 0, page, pageSize };

    const filters: BilanSteuFilters = {
      ouvrageDepollutionIds,
      year,
      page,
      pageSize,
      ...(ouvrageDepollutionCode ? { ouvrageDepollutionCode } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
    const result = await this.masaProvider.findBilanSteu(filters);
    return { ...result, page, pageSize };
  }

  async listBilanScl(options: ListBilanSclOptions) {
    const { authorizedSclCdas, year, systemeCollecteCode, pointMesureId, statut, page, pageSize, sortBy, sortOrder } =
      options;

    const cdasToQuery = systemeCollecteCode
      ? [systemeCollecteCode].filter((code) => authorizedSclCdas.includes(code))
      : authorizedSclCdas;

    if (cdasToQuery.length === 0 && systemeCollecteCode) {
      return { data: [], total: 0, page, pageSize };
    }

    const systemeCollecteIds = await this.resolveAuthorizedSclCdns(cdasToQuery);
    if (systemeCollecteIds.length === 0) return { data: [], total: 0, page, pageSize };

    const filters: BilanSclFilters = {
      systemeCollecteIds,
      year,
      page,
      pageSize,
      ...(systemeCollecteCode ? { systemeCollecteCode } : {}),
      ...(pointMesureId ? { pointMesureId } : {}),
      ...(statut ? { statut } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
    const result = await this.masaProvider.findBilanScl(filters);
    return { ...result, page, pageSize };
  }

  private async resolveAuthorizedSteuCdns(authorizedSteuCdas: string[]): Promise<number[]> {
    if (authorizedSteuCdas.length === 0) return [];
    const steus = await this.masaProvider.findSteuBatchBySandreCdas(authorizedSteuCdas);
    return [...new Set(steus.map((s) => s.ouvrageDepollutionId))];
  }

  private async resolveAuthorizedSclCdns(authorizedSclCdas: string[]): Promise<number[]> {
    if (authorizedSclCdas.length === 0) return [];
    const scls = await this.masaProvider.findSclBatchBySandreCdas(authorizedSclCdas);
    return [...new Set(scls.map((s) => s.systemeCollecteId))];
  }
}
