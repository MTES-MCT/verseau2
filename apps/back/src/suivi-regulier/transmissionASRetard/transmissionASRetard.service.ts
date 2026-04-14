import { Injectable } from '@nestjs/common';
import { TransmissionASRetardSteuSortByValue, TransmissionASRetardSclSortByValue, PaginationQuery } from '@lib/dossier';
import { MasaProvider } from '@masa/masa.provider';
import type { TransmissionASRetardSteuFilters, TransmissionASRetardSclFilters } from '@masa/masa.dto';
import { mapTransmissionASRetardSteuRowToDto, mapTransmissionASRetardSclRowToDto } from './transmissionASRetard.mapper';

export interface ListTransmissionASRetardSteuOptions extends PaginationQuery {
  authorizedSteuCdas: string[];
  year: number;
  ouvrageDepollutionCode?: string;
  sortBy?: TransmissionASRetardSteuSortByValue;
}

export interface ListTransmissionASRetardSclOptions extends PaginationQuery {
  authorizedSclCdas: string[];
  year: number;
  systemeCollecteCode?: string;
  sortBy?: TransmissionASRetardSclSortByValue;
}

@Injectable()
export class TransmissionASRetardService {
  constructor(private readonly masaProvider: MasaProvider) {}

  async listTransmissionASRetardSteu(options: ListTransmissionASRetardSteuOptions) {
    const { authorizedSteuCdas, year, ouvrageDepollutionCode, page, pageSize, sortBy, sortOrder } = options;
    const cdasToQuery = ouvrageDepollutionCode
      ? [ouvrageDepollutionCode].filter((code) => authorizedSteuCdas.includes(code))
      : authorizedSteuCdas;

    if (cdasToQuery.length === 0 && ouvrageDepollutionCode) {
      return { data: [], total: 0, page, pageSize };
    }

    const ouvrageDepollutionIds = await this.resolveAuthorizedSteuCdns(cdasToQuery);
    if (ouvrageDepollutionIds.length === 0) return { data: [], total: 0, page, pageSize };

    const filters: TransmissionASRetardSteuFilters = {
      ouvrageDepollutionIds,
      year,
      page,
      pageSize,
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
    const result = await this.masaProvider.findTransmissionASRetardSteu(filters);
    return {
      data: result.data.map(mapTransmissionASRetardSteuRowToDto),
      total: result.total,
      page,
      pageSize,
    };
  }

  async listTransmissionASRetardScl(options: ListTransmissionASRetardSclOptions) {
    const { authorizedSclCdas, year, systemeCollecteCode, page, pageSize, sortBy, sortOrder } = options;
    const cdasToQuery = systemeCollecteCode
      ? [systemeCollecteCode].filter((code) => authorizedSclCdas.includes(code))
      : authorizedSclCdas;

    if (cdasToQuery.length === 0 && systemeCollecteCode) {
      return { data: [], total: 0, page, pageSize };
    }

    const systemeCollecteIds = await this.resolveAuthorizedSclCdns(cdasToQuery);
    if (systemeCollecteIds.length === 0) return { data: [], total: 0, page, pageSize };

    const filters: TransmissionASRetardSclFilters = {
      systemeCollecteIds,
      year,
      page,
      pageSize,
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
    const result = await this.masaProvider.findTransmissionASRetardScl(filters);
    return {
      data: result.data.map(mapTransmissionASRetardSclRowToDto),
      total: result.total,
      page,
      pageSize,
    };
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
