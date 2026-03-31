import { Injectable, LOG_LEVELS } from '@nestjs/common';
import {
  ConformiteSclDetailDto,
  ConformiteSclSortByValue,
  ConformiteSteuDetailDto,
  ConformiteSteuSortByValue,
  PaginatedConformiteSclResponse,
  PaginatedConformiteSteuResponse,
  PaginationQuery,
} from '@lib/dossier';
import { MasaProvider } from '@masa/masa.provider';
import type { ConformiteSclFilters, ConformiteSteuFilters } from '@masa/masa.dto';
import { LoggerService } from '@shared/logger/logger.service';
import { TraceCalls } from '@shared/logger/traceCalls.decorator';

export interface ListConformiteSteuOptions extends PaginationQuery {
  authorizedSteuCdas: string[];
  year: number;
  trancheObligationLibelle?: string;
  impact?: 'avec' | 'sans';
  sortBy?: ConformiteSteuSortByValue;
}

export interface ListConformiteSclOptions extends PaginationQuery {
  authorizedSteuCdas: string[];
  year: number;
  trancheObligationLibelle?: string;
  impact?: 'avec' | 'sans';
  sortBy?: ConformiteSclSortByValue;
}

@Injectable()
export class ConformiteService {
  constructor(
    private readonly masaProvider: MasaProvider,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ConformiteService.name);
  }

  @TraceCalls(LOG_LEVELS[2])
  async listConformiteSteu(options: ListConformiteSteuOptions): Promise<PaginatedConformiteSteuResponse> {
    const { authorizedSteuCdas, year, trancheObligationLibelle, impact, page, pageSize, sortBy, sortOrder } = options;

    if (authorizedSteuCdas.length === 0) {
      return this.buildEmptyPaginatedResponse(page, pageSize);
    }

    const steuCdns = await this.resolveAuthorizedSteuCdns(authorizedSteuCdas);
    if (steuCdns.length === 0) {
      return this.buildEmptyPaginatedResponse(page, pageSize);
    }

    const filters: ConformiteSteuFilters = {
      steuCdns,
      year,
      page,
      pageSize,
      ...(trancheObligationLibelle ? { trancheObligationLibelle } : {}),
      ...(impact ? { impact } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };

    const { data, total } = await this.masaProvider.findConformiteSteu(filters);

    return { data, total, page, pageSize };
  }

  @TraceCalls(LOG_LEVELS[2])
  async listConformiteScl(options: ListConformiteSclOptions): Promise<PaginatedConformiteSclResponse> {
    const { authorizedSteuCdas, year, trancheObligationLibelle, impact, page, pageSize, sortBy, sortOrder } = options;

    if (authorizedSteuCdas.length === 0) {
      return this.buildEmptyPaginatedResponse(page, pageSize);
    }

    const steuCdns = await this.resolveAuthorizedSteuCdns(authorizedSteuCdas);
    if (steuCdns.length === 0) {
      return this.buildEmptyPaginatedResponse(page, pageSize);
    }

    const filters: ConformiteSclFilters = {
      steuCdns,
      year,
      page,
      pageSize,
      ...(trancheObligationLibelle ? { trancheObligationLibelle } : {}),
      ...(impact ? { impact } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };

    const { data, total } = await this.masaProvider.findConformiteScl(filters);

    return { data, total, page, pageSize };
  }

  @TraceCalls(LOG_LEVELS[2])
  async getConformiteSteuDetail(
    steuCdn: number,
    year: number,
    authorizedSteuCdas: string[],
  ): Promise<ConformiteSteuDetailDto | null> {
    const steuCdns = await this.resolveAuthorizedSteuCdns(authorizedSteuCdas);

    if (!steuCdns.includes(steuCdn)) {
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
  ): Promise<ConformiteSclDetailDto | null> {
    const sclCdns = await this.resolveAuthorizedSclCdns(authorizedSclCdas);

    if (!sclCdns.includes(sclCdn)) {
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

    return [...new Set(steus.map((steu) => steu.ouvrageDepollutionIdentifiant))];
  }

  private async resolveAuthorizedSclCdns(authorizedSclCdas: string[]): Promise<number[]> {
    if (authorizedSclCdas.length === 0) {
      return [];
    }

    const scls = await this.masaProvider.findSclBatchBySandreCdas(authorizedSclCdas);

    return [...new Set(scls.map((scl) => scl.sclCdn))];
  }
}
