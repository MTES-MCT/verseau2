import { Inject, Injectable, LOG_LEVELS } from '@nestjs/common';
import {
  ConformiteSclSortByValue,
  type ConformiteSclDto,
  type ConformiteSteuDto,
  ConformiteSteuSortByValue,
  PaginationQuery,
  TrancheObligationRfa,
  conformiteSteuPropertyToHeaderMapper,
} from '@lib/dossier';
import { CsvGenerator, type CsvColumn, formatDate } from '@lib/shared';
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

const CONFORMITE_SCL_CSV_COLUMNS: ReadonlyArray<CsvColumn<ConformiteSclDto>> = [
  { header: 'Code Sandre', value: (row) => row.systemeCollecteCode },
  { header: 'Nom', value: (row) => formatNullable(row.systemeCollecteNom) },
  { header: "Tranche d'obligation (EH)", value: (row) => formatNullable(row.trancheObligationLibelle) },
  { header: 'Type', value: (row) => formatNullable(row.typeScl) },
  { header: 'Début période', value: (row) => formatDate(row.suiviDebutDate) },
  { header: 'Fin période', value: (row) => formatDate(row.suiviFinDate) },
  {
    header: 'Conformité réglementaire temps pluie',
    value: (row) => formatConformite(row.conformiteLocaleTempsPluieProvisoire),
  },
  { header: 'Synthèse des changements', value: (row) => formatImpact(row.impactConformite) },
];

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

    return this.csvGenerator.generate(
      conformiteSteuPropertyToHeaderMapper as ReadonlyArray<CsvColumn<ConformiteSteuDto>>,
      rows,
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

    return this.csvGenerator.generate(CONFORMITE_SCL_CSV_COLUMNS, rows);
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
