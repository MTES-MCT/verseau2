import { Inject, Injectable } from '@nestjs/common';
import {
  TransmissionASRetardSteuSortByValue,
  TransmissionASRetardSclSortByValue,
  PaginationQuery,
  transmissionASRetardSteuPropertyToHeaderMapper,
  transmissionASRetardSclPropertyToHeaderMapper,
} from '@lib/dossier';
import { formatDate } from '@lib/shared';

import { CsvGenerator } from '@shared/csv/csv.types';
import { MasaProvider } from '@masa/masa.provider';
import type { TransmissionASRetardSteuFilters, TransmissionASRetardSclFilters } from '@masa/masa.dto';
import { formatNullable, formatRetard } from '@shared/csv/csvFormatters';
import {
  buildCsvColumnsFromPropertyToHeaderMapper,
  type CsvFormattedRow,
} from '@shared/csv/propertyToHeaderCsvColumns';
import { PaginatedExportService } from '@shared/csv/paginatedExport.service';
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
  constructor(
    private readonly masaProvider: MasaProvider,
    private readonly paginatedExportService: PaginatedExportService,
    @Inject(CsvGenerator) private readonly csvGenerator: CsvGenerator,
  ) {}

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

  async exportTransmissionASRetardSteuCsv(options: ListTransmissionASRetardSteuOptions): Promise<string> {
    const rows = await this.paginatedExportService.collectAllRows(async (page, pageSize) => {
      const filters = await this.buildTransmissionSteuFilters(options, page, pageSize);
      if (!filters) {
        return { data: [], total: 0 };
      }

      const result = await this.masaProvider.findTransmissionASRetardSteu(filters);
      return { data: result.data.map(mapTransmissionASRetardSteuRowToDto), total: result.total };
    });

    const formattedRows: CsvFormattedRow[] = rows.map((row) => ({
      ouvrageDepollutionCode: row.ouvrageDepollutionCode,
      ouvrageDepollutionNom: formatNullable(row.ouvrageDepollutionNom),
      trancheObligationLibelle: formatNullable(row.trancheObligationLibelle),
      capaciteNominaleEH: formatNullable(row.capaciteNominaleEH),
      nbFichiersAsRecus: formatNullable(row.nbFichiersAsRecus),
      dateDernierFichierRecu: formatDate(row.dateDernierFichierRecu),
      dateDebutPeriode: formatDate(row.dateDebutPeriode),
      dateFinPeriode: formatDate(row.dateFinPeriode),
      dateMesureSuivanteAttendue: formatDate(row.dateMesureSuivanteAttendue),
      nbJoursRetard: formatRetard(row.nbJoursRetard),
    }));

    return this.csvGenerator.generate(
      buildCsvColumnsFromPropertyToHeaderMapper(transmissionASRetardSteuPropertyToHeaderMapper),
      formattedRows,
    );
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

  async exportTransmissionASRetardSclCsv(options: ListTransmissionASRetardSclOptions): Promise<string> {
    const rows = await this.paginatedExportService.collectAllRows(async (page, pageSize) => {
      const filters = await this.buildTransmissionSclFilters(options, page, pageSize);
      if (!filters) {
        return { data: [], total: 0 };
      }

      const result = await this.masaProvider.findTransmissionASRetardScl(filters);
      return { data: result.data.map(mapTransmissionASRetardSclRowToDto), total: result.total };
    });

    const formattedRows: CsvFormattedRow[] = rows.map((row) => ({
      systemeCollecteCode: row.systemeCollecteCode,
      systemeCollecteNom: formatNullable(row.systemeCollecteNom),
      trancheObligationLibelle: formatNullable(row.trancheObligationLibelle),
      capaciteNominaleEH: formatNullable(row.capaciteNominaleEH),
      nbFichiersAsRecus: formatNullable(row.nbFichiersAsRecus),
      dateDernierFichierRecu: formatDate(row.dateDernierFichierRecu),
      dateDebutPeriode: formatDate(row.dateDebutPeriode),
      dateFinPeriode: formatDate(row.dateFinPeriode),
      dateMesureSuivanteAttendue: formatDate(row.dateMesureSuivanteAttendue),
      nbJoursRetard: formatRetard(row.nbJoursRetard),
    }));

    return this.csvGenerator.generate(
      buildCsvColumnsFromPropertyToHeaderMapper(transmissionASRetardSclPropertyToHeaderMapper),
      formattedRows,
    );
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

  private async buildTransmissionSteuFilters(
    options: ListTransmissionASRetardSteuOptions,
    page: number,
    pageSize: number,
  ): Promise<TransmissionASRetardSteuFilters | null> {
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
      page,
      pageSize,
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
  }

  private async buildTransmissionSclFilters(
    options: ListTransmissionASRetardSclOptions,
    page: number,
    pageSize: number,
  ): Promise<TransmissionASRetardSclFilters | null> {
    const { authorizedSclCdas, year, systemeCollecteCode, sortBy, sortOrder } = options;
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
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };
  }
}
