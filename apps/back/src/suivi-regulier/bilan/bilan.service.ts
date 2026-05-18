import { Inject, Injectable, LOG_LEVELS } from '@nestjs/common';
import {
  bilanSclPropertyToHeaderMapper,
  BilanSteuSortByValue,
  BilanSclSortByValue,
  PaginationQuery,
  bilanSteuPropertyToHeaderMapper,
} from '@lib/dossier';
import type { BilanSclDto, BilanSteuDto } from '@lib/dossier';
import { CsvGenerator, type CsvColumn } from '@lib/shared';
import { MasaProvider } from '@masa/masa.provider';
import type { BilanSteuFilters, BilanSclFilters } from '@masa/masa.dto';
import { CodeParametre } from '@referentiel/parametre/codeParametre';
import { PaginatedExportService } from '@shared/csv/paginatedExport.service';
import { TraceCalls } from '@shared/logger/traceCalls.decorator';

const ALLOWED_BILAN_STEU_PARAMETRE_CODES: string[] = [
  CodeParametre.DBO5,
  CodeParametre.DCO,
  CodeParametre.MES,
  CodeParametre.NGL,
  CodeParametre.N_NH4,
  CodeParametre.NTK,
  CodeParametre.NO2,
  CodeParametre.NO3,
  CodeParametre.pH,
  CodeParametre.Temperature,
  CodeParametre.Ptot,
].map(String);

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
  constructor(
    private readonly masaProvider: MasaProvider,
    private readonly paginatedExportService: PaginatedExportService,
    @Inject(CsvGenerator) private readonly csvGenerator: CsvGenerator,
  ) {}

  @TraceCalls(LOG_LEVELS[2])
  async listBilanSteu(options: ListBilanSteuOptions) {
    const { page, pageSize } = options;
    const filters = await this.buildBilanSteuFilters(options, page, pageSize);
    if (!filters) {
      return { data: [], total: 0, page, pageSize };
    }

    const result = await this.masaProvider.findBilanSteu(filters);
    return { ...result, page, pageSize };
  }

  @TraceCalls(LOG_LEVELS[2])
  async listBilanScl(options: ListBilanSclOptions) {
    const { page, pageSize } = options;
    const filters = await this.buildBilanSclFilters(options, page, pageSize);
    if (!filters) {
      return { data: [], total: 0, page, pageSize };
    }

    const result = await this.masaProvider.findBilanScl(filters);
    return { ...result, page, pageSize };
  }

  @TraceCalls(LOG_LEVELS[2])
  async exportBilanSteuCsv(options: ListBilanSteuOptions): Promise<string> {
    const rows = await this.paginatedExportService.collectAllRows(async (page, pageSize) => {
      const filters = await this.buildBilanSteuFilters(options, page, pageSize);
      if (!filters) {
        return { data: [], total: 0 };
      }

      return this.masaProvider.findBilanSteu(filters);
    });

    return this.csvGenerator.generate(bilanSteuPropertyToHeaderMapper as ReadonlyArray<CsvColumn<BilanSteuDto>>, rows);
  }

  @TraceCalls(LOG_LEVELS[2])
  async exportBilanSclCsv(options: ListBilanSclOptions): Promise<string> {
    const rows = await this.paginatedExportService.collectAllRows(async (page, pageSize) => {
      const filters = await this.buildBilanSclFilters(options, page, pageSize);
      if (!filters) {
        return { data: [], total: 0 };
      }

      return this.masaProvider.findBilanScl(filters);
    });

    return this.csvGenerator.generate(bilanSclPropertyToHeaderMapper as ReadonlyArray<CsvColumn<BilanSclDto>>, rows);
  }

  private async buildBilanSteuFilters(
    options: ListBilanSteuOptions,
    page: number,
    pageSize: number,
  ): Promise<BilanSteuFilters | null> {
    const { authorizedSteuCdas, year, ouvrageDepollutionCode, sortBy, sortOrder } = options;
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
      parametreCodes: ALLOWED_BILAN_STEU_PARAMETRE_CODES,
      page,
      pageSize,
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
  }

  private async buildBilanSclFilters(
    options: ListBilanSclOptions,
    page: number,
    pageSize: number,
  ): Promise<BilanSclFilters | null> {
    const { authorizedSclCdas, year, systemeCollecteCode, pointMesureId, statut, sortBy, sortOrder } = options;
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
      ...(pointMesureId ? { pointMesureId } : {}),
      ...(statut ? { statut } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
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
