import { Injectable, LOG_LEVELS } from '@nestjs/common';
import { MasaProvider } from '@masa/masa.provider';
import { PaginatedMesuresResponse, PaginationQuery } from '@lib/dossier';
import { MesureFilters, SteuWithName, PointMesure, ParametreMesure } from '@masa/masa.dto';
import { TraceCalls } from '@shared/logger/traceCalls.decorator';

export interface ListMesuresOptions extends PaginationQuery {
  itvCdn: number | null;
  steuSandreCdas?: string[];
  pmoCdn?: number;
  dateDebut?: string;
  dateFin?: string;
  parametreCode?: string;
  qualification?: string;
  finalite?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class MesuresService {
  constructor(private readonly masaProvider: MasaProvider) {}

  @TraceCalls(LOG_LEVELS[2])
  async listMesures(options: ListMesuresOptions): Promise<PaginatedMesuresResponse> {
    const { itvCdn, steuSandreCdas: requestedSteus = [], ...rest } = options;

    // Résoudre les STEU autorisés pour l'utilisateur connecté
    let authorizedSteuCdas: string[] = [];

    if (itvCdn !== null) {
      const intervenant = await this.masaProvider.findIntervenantById(itvCdn);
      if (intervenant?.itvRfa) {
        const authorizedSteus = await this.masaProvider.findVSteuSclItvByItvRfa(intervenant.itvRfa);
        authorizedSteuCdas = [...new Set(authorizedSteus.map((s) => s.steuCda).filter(Boolean))];
      }
    }

    // Intersect avec les STEU demandés par le filtre (si fournis)
    const steuSandreCdas =
      requestedSteus.length > 0 ? requestedSteus.filter((cda) => authorizedSteuCdas.includes(cda)) : authorizedSteuCdas;

    // Si aucun STEU autorisé, retourner vide immédiatement
    if (steuSandreCdas.length === 0) {
      return { data: [], total: 0, page: rest.page, pageSize: rest.pageSize };
    }

    const filters: MesureFilters = {
      steuSandreCdas,
      ...rest,
    };

    const { data, total } = await this.masaProvider.findMesures(filters);

    return {
      data: data.map((row) => ({
        ...row,
        date: row.date,
      })),
      total,
      page: rest.page,
      pageSize: rest.pageSize,
    };
  }

  async listOuvrages(itvCdn: number | null): Promise<SteuWithName[]> {
    if (itvCdn === null) return [];

    const intervenant = await this.masaProvider.findIntervenantById(itvCdn);
    if (!intervenant?.itvRfa) return [];

    const authorizedSteus = await this.masaProvider.findVSteuSclItvByItvRfa(intervenant.itvRfa);
    const sandreCdas = [...new Set(authorizedSteus.map((s) => s.steuCda).filter(Boolean))];
    if (sandreCdas.length === 0) return [];

    return this.masaProvider.findSteuWithNamesBySandreCdas(sandreCdas);
  }

  async listPointsMesure(itvCdn: number | null, steuSandreCda: string): Promise<PointMesure[]> {
    if (itvCdn === null) return [];

    const authorizedSteus = await this.listOuvrages(itvCdn);
    const isAuthorized = authorizedSteus.some((s) => s.steuSandreCda === steuSandreCda);
    if (!isAuthorized) return [];

    return this.masaProvider.findPointsMesureBySandreCda(steuSandreCda);
  }

  async listParametresMesure(itvCdn: number | null, steuSandreCda: string, pmoCdn: number): Promise<ParametreMesure[]> {
    if (itvCdn === null) return [];

    const authorizedSteus = await this.listOuvrages(itvCdn);
    const isAuthorized = authorizedSteus.some((s) => s.steuSandreCda === steuSandreCda);
    if (!isAuthorized) return [];

    return this.masaProvider.findParametresBySteuAndPmo(steuSandreCda, pmoCdn);
  }
}
