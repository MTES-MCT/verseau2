import { Inject, Injectable, LOG_LEVELS } from '@nestjs/common';
import {
  ConformiteSclSortByValue,
  conformiteSclPropertyToHeaderMapper,
  ConformiteSteuSortByValue,
  PaginationQuery,
  TrancheObligationRfa,
  conformiteSteuPropertyToHeaderMapper,
} from '@lib/dossier';
import { formatDate } from '@lib/shared';

import { CsvGenerator } from '@shared/csv/csv.types';
import { MasaProvider } from '@masa/masa.provider';
import type {
  ConformiteSclDetailRow,
  ConformiteSclFilters,
  ConformiteSclRow,
  ConformiteSteuDetailRow,
  ConformiteSteuFilters,
  ConformiteSteuRow,
} from '@masa/masa.dto';
import { formatConformite, formatImpact, formatNullable } from '@shared/csv/csvFormatters';
import {
  buildCsvColumnsFromPropertyToHeaderMapper,
  type CsvFormattedRow,
} from '@shared/csv/propertyToHeaderCsvColumns';
import { PaginatedExportService } from '@shared/csv/paginatedExport.service';
import { LoggerService } from '@shared/logger/logger.service';
import { TraceCalls } from '@shared/logger/traceCalls.decorator';
import { toConformiteSclDto, toConformiteSteuDto } from './conformite.mapper';

type PaginatedConformiteSteuRows = {
  data: ConformiteSteuRow[];
  total: number;
  page: number;
  pageSize: number;
};

type PaginatedConformiteSclRows = {
  data: ConformiteSclRow[];
  total: number;
  page: number;
  pageSize: number;
};

export interface ListConformiteSteuOptions extends PaginationQuery {
  authorizedSteuCdas: string[];
  year: number;
  ouvrageDepollutionCode?: string;
  trancheObligationRfa?: TrancheObligationRfa;
  impact?: 'avec' | 'sans';
  sortBy?: ConformiteSteuSortByValue;
}

export interface ListConformiteSclOptions extends PaginationQuery {
  authorizedSteuCdas: string[];
  year: number;
  systemeCollecteCode?: string;
  trancheObligationRfa?: TrancheObligationRfa;
  impact?: 'avec' | 'sans';
  sortBy?: ConformiteSclSortByValue;
}

@Injectable()
export class ConformiteService {
  constructor(
    private readonly masaProvider: MasaProvider,
    private readonly logger: LoggerService,
    private readonly paginatedExportService: PaginatedExportService,
    @Inject(CsvGenerator) private readonly csvGenerator: CsvGenerator,
  ) {
    this.logger.setContext(ConformiteService.name);
  }

  @TraceCalls(LOG_LEVELS[2])
  async listConformiteSteu(options: ListConformiteSteuOptions): Promise<PaginatedConformiteSteuRows> {
    const {
      authorizedSteuCdas,
      year,
      ouvrageDepollutionCode,
      trancheObligationRfa,
      impact,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = options;

    if (authorizedSteuCdas.length === 0) {
      return this.buildEmptyPaginatedResponse(page, pageSize);
    }

    const ouvrageDepollutionIds = await this.resolveAuthorizedSteuCdns(authorizedSteuCdas);
    if (ouvrageDepollutionIds.length === 0) {
      return this.buildEmptyPaginatedResponse(page, pageSize);
    }

    const filters: ConformiteSteuFilters = {
      ouvrageDepollutionIds,
      year,
      page,
      pageSize,
      ...(ouvrageDepollutionCode ? { ouvrageDepollutionCode } : {}),
      ...(trancheObligationRfa ? { trancheObligationRfa } : {}),
      ...(impact ? { impact } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };

    const { data, total } = await this.masaProvider.findConformiteSteu(filters);

    return { data, total, page, pageSize };
  }

  @TraceCalls(LOG_LEVELS[2])
  async exportConformiteSteuCsv(options: ListConformiteSteuOptions): Promise<string> {
    const rows = await this.paginatedExportService.collectAllRows(async (page, pageSize) => {
      const result = await this.listConformiteSteu({ ...options, page, pageSize });
      return { data: result.data.map(toConformiteSteuDto), total: result.total };
    });

    const formattedRows: CsvFormattedRow[] = rows.map((row) => ({
      ouvrageDepollutionCode: row.ouvrageDepollutionCode,
      ouvrageDepollutionNom: formatNullable(row.ouvrageDepollutionNom),
      trancheObligationLibelle: formatNullable(row.trancheObligationLibelle),
      capaciteNominaleEH: formatNullable(row.capaciteNominaleEH),
      suiviDebutDate: formatDate(row.suiviDebutDate),
      suiviFinDate: formatDate(row.suiviFinDate),
      conformiteLocaleProvisoire: formatConformite(row.conformiteLocaleProvisoire),
      impactConformite: formatImpact(row.impactConformite),
    }));

    return this.csvGenerator.generate(
      buildCsvColumnsFromPropertyToHeaderMapper(conformiteSteuPropertyToHeaderMapper),
      formattedRows,
    );
  }

  @TraceCalls(LOG_LEVELS[2])
  async listConformiteScl(options: ListConformiteSclOptions): Promise<PaginatedConformiteSclRows> {
    const {
      authorizedSteuCdas,
      year,
      systemeCollecteCode,
      trancheObligationRfa,
      impact,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = options;

    if (authorizedSteuCdas.length === 0) {
      return this.buildEmptyPaginatedResponse(page, pageSize);
    }

    const ouvrageDepollutionIds = await this.resolveAuthorizedSteuCdns(authorizedSteuCdas);
    if (ouvrageDepollutionIds.length === 0) {
      return this.buildEmptyPaginatedResponse(page, pageSize);
    }

    const filters: ConformiteSclFilters = {
      ouvrageDepollutionIds,
      year,
      page,
      pageSize,
      ...(systemeCollecteCode ? { systemeCollecteCode } : {}),
      ...(trancheObligationRfa ? { trancheObligationRfa } : {}),
      ...(impact ? { impact } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };

    const { data, total } = await this.masaProvider.findConformiteScl(filters);

    return { data, total, page, pageSize };
  }

  @TraceCalls(LOG_LEVELS[2])
  async exportConformiteSclCsv(options: ListConformiteSclOptions): Promise<string> {
    const rows = await this.paginatedExportService.collectAllRows(async (page, pageSize) => {
      const result = await this.listConformiteScl({ ...options, page, pageSize });
      return { data: result.data.map(toConformiteSclDto), total: result.total };
    });

    const formattedRows: CsvFormattedRow[] = rows.map((row) => ({
      systemeCollecteCode: row.systemeCollecteCode,
      systemeCollecteNom: formatNullable(row.systemeCollecteNom),
      trancheObligationLibelle: formatNullable(row.trancheObligationLibelle),
      typeScl: formatNullable(row.typeScl),
      suiviDebutDate: formatDate(row.suiviDebutDate),
      suiviFinDate: formatDate(row.suiviFinDate),
      conformiteLocaleTempsPluieProvisoire: formatConformite(row.conformiteLocaleTempsPluieProvisoire),
      impactConformite: formatImpact(row.impactConformite),
    }));

    return this.csvGenerator.generate(
      buildCsvColumnsFromPropertyToHeaderMapper(conformiteSclPropertyToHeaderMapper),
      formattedRows,
    );
  }

  @TraceCalls(LOG_LEVELS[2])
  async getConformiteSteuDetail(
    steuCdn: number,
    year: number,
    authorizedSteuCdas: string[],
  ): Promise<ConformiteSteuDetailRow | null> {
    const ouvrageDepollutionIds = await this.resolveAuthorizedSteuCdns(authorizedSteuCdas);

    if (!ouvrageDepollutionIds.includes(steuCdn)) {
      this.logger.warn(`Accès refusé au détail conformité STEU ${steuCdn}`);
      return null;
    }

    return this.masaProvider.findConformiteSteuDetail(steuCdn, year);
  }

  @TraceCalls(LOG_LEVELS[2])
  async getConformiteSclDetail(
    sclCdn: number,
    year: number,
    authorizedSclCdas: string[],
  ): Promise<ConformiteSclDetailRow | null> {
    const systemeCollecteIds = await this.resolveAuthorizedSclCdns(authorizedSclCdas);

    if (!systemeCollecteIds.includes(sclCdn)) {
      this.logger.warn(`Accès refusé au détail conformité SCL ${sclCdn}`);
      return null;
    }

    return this.masaProvider.findConformiteSclDetail(sclCdn, year);
  }

  private buildEmptyPaginatedResponse(page: number, pageSize: number) {
    return { data: [], total: 0, page, pageSize };
  }

  private async resolveAuthorizedSteuCdns(authorizedSteuCdas: string[]): Promise<number[]> {
    if (authorizedSteuCdas.length === 0) {
      return [];
    }

    const steus = await this.masaProvider.findSteuBatchBySandreCdas(authorizedSteuCdas);

    return [...new Set(steus.map((steu) => steu.ouvrageDepollutionId))];
  }

  private async resolveAuthorizedSclCdns(authorizedSclCdas: string[]): Promise<number[]> {
    if (authorizedSclCdas.length === 0) {
      return [];
    }

    const scls = await this.masaProvider.findSclBatchBySandreCdas(authorizedSclCdas);

    return [...new Set(scls.map((scl) => scl.systemeCollecteId))];
  }
}
