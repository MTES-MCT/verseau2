import { Inject, Injectable } from '@nestjs/common';
import {
  EvenementSteuSortByValue,
  EvenementSclSortByValue,
  PaginationQuery,
  evenementSteuPropertyToHeaderMapper,
  evenementSclPropertyToHeaderMapper,
} from '@lib/dossier';
import type { EvenementSclDto, EvenementSteuDto } from '@lib/dossier';
import { CsvGenerator, type CsvColumn } from '@lib/shared';
import { MasaProvider } from '@masa/masa.provider';
import type { EvenementSteuFilters, EvenementSclFilters } from '@masa/masa.dto';
import { PaginatedExportService } from '@shared/csv/paginatedExport.service';

const DEFAULT_TYPE_EVENEMENT_CODES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export interface ListEvenementSteuOptions extends PaginationQuery {
  authorizedSteuCdas: string[];
  year: number;
  typeEvenementCode?: string | null;
  ouvrageDepollutionCode?: string;
  pointMesureId?: number;
  sortBy?: EvenementSteuSortByValue;
}

export interface ListEvenementSclOptions extends PaginationQuery {
  authorizedSclCdas: string[];
  year: number;
  typeEvenementCode?: string | null;
  systemeCollecteCode?: string;
  pointMesureId?: number;
  sortBy?: EvenementSclSortByValue;
}

@Injectable()
export class EvenementService {
  constructor(
    private readonly masaProvider: MasaProvider,
    private readonly paginatedExportService: PaginatedExportService,
    @Inject(CsvGenerator) private readonly csvGenerator: CsvGenerator,
  ) {}

  async listEvenementSteu(options: ListEvenementSteuOptions) {
    const {
      authorizedSteuCdas,
      year,
      typeEvenementCode,
      ouvrageDepollutionCode,
      pointMesureId,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = options;
    const cdasToQuery = ouvrageDepollutionCode
      ? [ouvrageDepollutionCode].filter((code) => authorizedSteuCdas.includes(code))
      : authorizedSteuCdas;

    if (cdasToQuery.length === 0 && ouvrageDepollutionCode) {
      return { data: [], total: 0, page, pageSize };
    }

    const ouvrageDepollutionIds = await this.resolveAuthorizedSteuCdns(cdasToQuery);
    if (ouvrageDepollutionIds.length === 0) {
      return { data: [], total: 0, page, pageSize };
    }
    const filters: EvenementSteuFilters = {
      ouvrageDepollutionIds,
      year,
      page,
      pageSize,
      typeEvenementCodes: this.normalizeTypeEvenementCodes(typeEvenementCode),
      ...(pointMesureId ? { pointMesureId } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
    const result = await this.masaProvider.findEvenementSteu(filters);
    return { ...result, page, pageSize };
  }

  async exportEvenementSteuCsv(options: ListEvenementSteuOptions): Promise<string> {
    const rows = await this.paginatedExportService.collectAllRows(async (page, pageSize) => {
      const filters = await this.buildEvenementSteuFilters(options, page, pageSize);
      if (!filters) {
        return { data: [], total: 0 };
      }

      return this.masaProvider.findEvenementSteu(filters);
    });

    return this.csvGenerator.generate(
      evenementSteuPropertyToHeaderMapper as ReadonlyArray<CsvColumn<EvenementSteuDto>>,
      rows,
    );
  }

  async listEvenementScl(options: ListEvenementSclOptions) {
    const {
      authorizedSclCdas,
      year,
      typeEvenementCode,
      systemeCollecteCode,
      pointMesureId,
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

    const systemeCollecteIds = await this.resolveAuthorizedSclCdns(cdasToQuery);
    if (systemeCollecteIds.length === 0) {
      return { data: [], total: 0, page, pageSize };
    }
    const filters: EvenementSclFilters = {
      systemeCollecteIds,
      year,
      page,
      pageSize,
      typeEvenementCodes: this.normalizeTypeEvenementCodes(typeEvenementCode),
      ...(pointMesureId ? { pointMesureId } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
    const result = await this.masaProvider.findEvenementScl(filters);
    return { ...result, page, pageSize };
  }

  async exportEvenementSclCsv(options: ListEvenementSclOptions): Promise<string> {
    const rows = await this.paginatedExportService.collectAllRows(async (page, pageSize) => {
      const filters = await this.buildEvenementSclFilters(options, page, pageSize);
      if (!filters) {
        return { data: [], total: 0 };
      }

      return this.masaProvider.findEvenementScl(filters);
    });

    return this.csvGenerator.generate(
      evenementSclPropertyToHeaderMapper as ReadonlyArray<CsvColumn<EvenementSclDto>>,
      rows,
    );
  }

  async listEvenementTypes() {
    return this.masaProvider.findEvenementTypes();
  }

  async listAvailablePointsMesure(authorizedSclCdas: string[]) {
    const systemeCollecteIds = await this.resolveAuthorizedSclCdns(authorizedSclCdas);
    if (systemeCollecteIds.length === 0) return [];
    return this.masaProvider.findPointsMesureBySystemesCollecte(systemeCollecteIds);
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

  private normalizeTypeEvenementCodes(typeEvenementCode?: string | null): string[] {
    if (!typeEvenementCode) {
      return [...DEFAULT_TYPE_EVENEMENT_CODES];
    }

    return [typeEvenementCode];
  }

  private async buildEvenementSteuFilters(
    options: ListEvenementSteuOptions,
    page: number,
    pageSize: number,
  ): Promise<EvenementSteuFilters | null> {
    const { authorizedSteuCdas, year, typeEvenementCode, ouvrageDepollutionCode, pointMesureId, sortBy, sortOrder } =
      options;
    const cdasToQuery = ouvrageDepollutionCode
      ? [ouvrageDepollutionCode].filter((code) => authorizedSteuCdas.includes(code))
      : authorizedSteuCdas;

    if (cdasToQuery.length === 0 && ouvrageDepollutionCode) {
      return null;
    }

    const ouvrageDepollutionIds = await this.resolveAuthorizedSteuCdns(cdasToQuery);
    if (ouvrageDepollutionIds.length === 0) {
      return null;
    }

    return {
      ouvrageDepollutionIds,
      year,
      page,
      pageSize,
      typeEvenementCodes: this.normalizeTypeEvenementCodes(typeEvenementCode),
      ...(pointMesureId ? { pointMesureId } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
  }

  private async buildEvenementSclFilters(
    options: ListEvenementSclOptions,
    page: number,
    pageSize: number,
  ): Promise<EvenementSclFilters | null> {
    const { authorizedSclCdas, year, typeEvenementCode, systemeCollecteCode, pointMesureId, sortBy, sortOrder } =
      options;
    const cdasToQuery = systemeCollecteCode
      ? [systemeCollecteCode].filter((code) => authorizedSclCdas.includes(code))
      : authorizedSclCdas;

    if (cdasToQuery.length === 0 && systemeCollecteCode) {
      return null;
    }

    const systemeCollecteIds = await this.resolveAuthorizedSclCdns(cdasToQuery);
    if (systemeCollecteIds.length === 0) {
      return null;
    }

    return {
      systemeCollecteIds,
      year,
      page,
      pageSize,
      typeEvenementCodes: this.normalizeTypeEvenementCodes(typeEvenementCode),
      ...(pointMesureId ? { pointMesureId } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
  }
}
