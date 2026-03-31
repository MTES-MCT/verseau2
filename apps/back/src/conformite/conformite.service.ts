import { Inject, Injectable, LOG_LEVELS } from '@nestjs/common';
import type { PaginatedConformiteSteuResponse, PaginatedConformiteSclResponse } from '@lib/dossier';
import type {
  ConformiteSteuFilters as ConformiteSteuQuery,
  ConformiteSclFilters as ConformiteSclQuery,
  ConformiteSteuDetailRow,
  ConformiteSclDetailRow,
} from '@masa/masa.dto';
import { RoseauGateway as RoseauGatewayToken } from '@referentiel/roseau/roseau.gateway';
import type { RoseauGateway } from '@referentiel/roseau/roseau.gateway';
import { TraceCalls } from '@shared/logger/traceCalls.decorator';

const resolveSteuCdns = async (roseauGateway: RoseauGateway, authorizedSteuCdas: string[]): Promise<number[]> => {
  if (authorizedSteuCdas.length === 0) return [];
  const steus = await roseauGateway.findSteuBatchBySandreCdas(authorizedSteuCdas);
  return steus.map((s) => s.ouvrageDepollutionIdentifiant);
};

@Injectable()
export class ConformiteService {
  constructor(@Inject(RoseauGatewayToken) private readonly roseauGateway: RoseauGateway) {}

  @TraceCalls(LOG_LEVELS[2])
  async listConformiteSteu(
    authorizedSteuCdas: string[],
    filters: Omit<ConformiteSteuQuery, 'steuCdns'>,
  ): Promise<PaginatedConformiteSteuResponse> {
    const steuCdns = await resolveSteuCdns(this.roseauGateway, authorizedSteuCdas);

    if (steuCdns.length === 0) {
      return { data: [], total: 0, page: filters.page, pageSize: filters.pageSize };
    }

    const { data, total } = await this.roseauGateway.findConformiteSteu({
      ...filters,
      steuCdns,
    });

    return {
      data,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  @TraceCalls(LOG_LEVELS[2])
  async listConformiteScl(
    authorizedSteuCdas: string[],
    filters: Omit<ConformiteSclQuery, 'steuCdns'>,
  ): Promise<PaginatedConformiteSclResponse> {
    const steuCdns = await resolveSteuCdns(this.roseauGateway, authorizedSteuCdas);

    if (steuCdns.length === 0) {
      return { data: [], total: 0, page: filters.page, pageSize: filters.pageSize };
    }

    const { data, total } = await this.roseauGateway.findConformiteScl({
      ...filters,
      steuCdns,
    });

    return {
      data,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }

  async getConformiteSteuDetail(
    steuCdn: number,
    authorizedSteuCdas: string[],
  ): Promise<ConformiteSteuDetailRow | null> {
    const authorizedSteuCdns = await resolveSteuCdns(this.roseauGateway, authorizedSteuCdas);

    if (!authorizedSteuCdns.includes(steuCdn)) {
      return null;
    }

    return this.roseauGateway.findConformiteSteuDetail(steuCdn, new Date().getFullYear());
  }

  async getConformiteSclDetail(sclCdn: number, authorizedSteuCdas: string[]): Promise<ConformiteSclDetailRow | null> {
    // Note: SCL are tied to STEU, authorized STEU CDNs are used for authorization.
    const authorizedSteuCdns = await resolveSteuCdns(this.roseauGateway, authorizedSteuCdas);

    // For now, allow detail if at least one STEU is authorized as per requirement pattern.
    if (authorizedSteuCdns.length === 0) {
      return null;
    }

    return this.roseauGateway.findConformiteSclDetail(sclCdn, new Date().getFullYear());
  }
}
