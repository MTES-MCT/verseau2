import { Injectable } from '@nestjs/common';
import { EvenementSteuSortByValue, EvenementSclSortByValue, PaginationQuery } from '@lib/dossier';
import { MasaProvider } from '@masa/masa.provider';
import type { EvenementSteuFilters, EvenementSclFilters } from '@masa/masa.dto';

export interface ListEvenementSteuOptions extends PaginationQuery {
  authorizedSteuCdas: string[];
  year: number;
  typeEvenementCode?: string;
  ouvrageDepollutionCode?: string;
  sortBy?: EvenementSteuSortByValue;
}

export interface ListEvenementSclOptions extends PaginationQuery {
  authorizedSclCdas: string[];
  year: number;
  typeEvenementCode?: string;
  systemeCollecteCode?: string;
  pointMesureIdentifiant?: number;
  sortBy?: EvenementSclSortByValue;
}

@Injectable()
export class EvenementService {
  constructor(private readonly masaProvider: MasaProvider) {}

  async listEvenementSteu(options: ListEvenementSteuOptions) {
    const { authorizedSteuCdas, year, typeEvenementCode, ouvrageDepollutionCode, page, pageSize, sortBy, sortOrder } =
      options;
    const cdasToQuery = ouvrageDepollutionCode
      ? [ouvrageDepollutionCode].filter((code) => authorizedSteuCdas.includes(code))
      : authorizedSteuCdas;

    if (cdasToQuery.length === 0 && ouvrageDepollutionCode) {
      return { data: [], total: 0, page, pageSize };
    }

    const steuCdns = await this.resolveAuthorizedSteuCdns(cdasToQuery);
    if (steuCdns.length === 0) return { data: [], total: 0, page, pageSize };
    const filters: EvenementSteuFilters = {
      steuCdns,
      year,
      page,
      pageSize,
      ...(typeEvenementCode ? { typeEvenementCode } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
    const result = await this.masaProvider.findEvenementSteu(filters);
    return { ...result, page, pageSize };
  }

  async listEvenementScl(options: ListEvenementSclOptions) {
    const {
      authorizedSclCdas,
      year,
      typeEvenementCode,
      systemeCollecteCode,
      pointMesureIdentifiant,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = options;
    const cdasToQuery = systemeCollecteCode
      ? [systemeCollecteCode].filter((code) => authorizedSclCdas.includes(code))
      : authorizedSclCdas;

    if (cdasToQuery.length === 0 && systemeCollecteCode) {
      return { data: [], total: 0, page, pageSize };
    }

    const sclCdns = await this.resolveAuthorizedSclCdns(cdasToQuery);
    if (sclCdns.length === 0) return { data: [], total: 0, page, pageSize };
    const filters: EvenementSclFilters = {
      sclCdns,
      year,
      page,
      pageSize,
      ...(typeEvenementCode ? { typeEvenementCode } : {}),
      ...(pointMesureIdentifiant ? { pointMesureIdentifiant } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
    const result = await this.masaProvider.findEvenementScl(filters);
    return { ...result, page, pageSize };
  }

  async listEvenementTypes() {
    return this.masaProvider.findEvenementTypes();
  }

  async listAvailablePointsMesure(authorizedSclCdas: string[]) {
    const sclCdns = await this.resolveAuthorizedSclCdns(authorizedSclCdas);
    if (sclCdns.length === 0) return [];
    return this.masaProvider.findPointsMesureBySclCdns(sclCdns);
  }

  private async resolveAuthorizedSteuCdns(authorizedSteuCdas: string[]): Promise<number[]> {
    if (authorizedSteuCdas.length === 0) return [];
    const steus = await this.masaProvider.findSteuBatchBySandreCdas(authorizedSteuCdas);
    return [...new Set(steus.map((s) => s.ouvrageDepollutionIdentifiant))];
  }

  private async resolveAuthorizedSclCdns(authorizedSclCdas: string[]): Promise<number[]> {
    if (authorizedSclCdas.length === 0) return [];
    const scls = await this.masaProvider.findSclBatchBySandreCdas(authorizedSclCdas);
    return [...new Set(scls.map((s) => s.systemeCollecteIdentifiant))];
  }
}
