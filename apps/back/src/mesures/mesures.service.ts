import { Injectable, LOG_LEVELS } from '@nestjs/common';
import { MasaProvider } from '@masa/masa.provider';
import { PaginatedMesuresResponse, PaginationQuery, MesuresSortByValue, OuvrageTypeValue } from '@lib/dossier';
import { MesureFilters, SteuWithName, SclWithName, PointMesure, ParametreMesure, NomenclatureItem } from '@masa/masa.dto';
import { TraceCalls } from '@shared/logger/traceCalls.decorator';

export interface ListMesuresOptions extends PaginationQuery {
  itvCdn: number | null;
  ouvrageType: OuvrageTypeValue;
  steuSandreCdas?: string[];
  sclSandreCdas?: string[];
  pmoCdn?: number;
  dateDebut?: string;
  dateFin?: string;
  parametreCode?: string;
  qualification?: string;
  finalite?: string;
  sortBy?: MesuresSortByValue;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class MesuresService {
  constructor(private readonly masaProvider: MasaProvider) {}

  /** Résout les codes SANDRE des STEU autorisés pour un utilisateur donné. */
  private async getAuthorizedSteuCdas(itvCdn: number | null): Promise<string[]> {
    if (itvCdn === null) return [];
    const intervenant = await this.masaProvider.findIntervenantById(itvCdn);
    if (!intervenant?.itvRfa) return [];
    const authorizedSteus = await this.masaProvider.findVSteuSclItvByItvRfa(intervenant.itvRfa);
    return [...new Set(authorizedSteus.map((s) => s.steuCda).filter(Boolean))];
  }

  /** Résout les codes SANDRE des SCL autorisés pour un utilisateur donné. */
  private async getAuthorizedSclCdas(itvCdn: number | null): Promise<string[]> {
    if (itvCdn === null) return [];
    const intervenant = await this.masaProvider.findIntervenantById(itvCdn);
    if (!intervenant?.itvRfa) return [];
    const authorizedEntries = await this.masaProvider.findVSteuSclItvByItvRfa(intervenant.itvRfa);
    return [...new Set(authorizedEntries.map((s) => s.sclCda).filter(Boolean))];
  }

  @TraceCalls(LOG_LEVELS[2])
  async listMesures(options: ListMesuresOptions): Promise<PaginatedMesuresResponse> {
    const masaProvider = this.masaProvider;
    const { itvCdn, ouvrageType, steuSandreCdas: requestedSteus = [], sclSandreCdas: requestedScls = [], ...rest } = options;

    // Helper local pour éviter le problème de proxy TraceCalls sur les méthodes this.*
    const getAuthorizedSteuCdas = async (): Promise<string[]> => {
      if (itvCdn === null) return [];
      const intervenant = await masaProvider.findIntervenantById(itvCdn);
      if (!intervenant?.itvRfa) return [];
      const authorized = await masaProvider.findVSteuSclItvByItvRfa(intervenant.itvRfa);
      return [...new Set(authorized.map((s) => s.steuCda).filter(Boolean))];
    };

    const getAuthorizedSclCdas = async (): Promise<string[]> => {
      if (itvCdn === null) return [];
      const intervenant = await masaProvider.findIntervenantById(itvCdn);
      if (!intervenant?.itvRfa) return [];
      const authorized = await masaProvider.findVSteuSclItvByItvRfa(intervenant.itvRfa);
      return [...new Set(authorized.map((s) => s.sclCda).filter(Boolean))];
    };

    let filters: MesureFilters;

    if (ouvrageType === 'scl') {
      const authorizedSclCdas = await getAuthorizedSclCdas();
      const sclSandreCdas =
        requestedScls.length > 0 ? requestedScls.filter((cda) => authorizedSclCdas.includes(cda)) : authorizedSclCdas;

      if (sclSandreCdas.length === 0) {
        return { data: [], total: 0, page: rest.page, pageSize: rest.pageSize };
      }

      filters = { ouvrageType: 'scl', steuSandreCdas: [], sclSandreCdas, ...rest };
    } else {
      const authorizedSteuCdas = await getAuthorizedSteuCdas();
      const steuSandreCdas =
        requestedSteus.length > 0 ? requestedSteus.filter((cda) => authorizedSteuCdas.includes(cda)) : authorizedSteuCdas;

      if (steuSandreCdas.length === 0) {
        return { data: [], total: 0, page: rest.page, pageSize: rest.pageSize };
      }

      filters = { ouvrageType: 'steu', steuSandreCdas, sclSandreCdas: [], ...rest };
    }

    const { data, total } = await masaProvider.findMesures(filters);

    return {
      data: data.map((row) => ({ ...row, date: row.date })),
      total,
      page: rest.page,
      pageSize: rest.pageSize,
    };
  }

  async listOuvrages(itvCdn: number | null): Promise<SteuWithName[]> {
    if (itvCdn === null) return [];
    const sandreCdas = await this.getAuthorizedSteuCdas(itvCdn);
    if (sandreCdas.length === 0) return [];
    return this.masaProvider.findSteuWithNamesBySandreCdas(sandreCdas);
  }

  async listSystemesCollecte(itvCdn: number | null): Promise<SclWithName[]> {
    if (itvCdn === null) return [];
    const sandreCdas = await this.getAuthorizedSclCdas(itvCdn);
    if (sandreCdas.length === 0) return [];
    return this.masaProvider.findSclWithNamesBySandreCdas(sandreCdas);
  }

  async listPointsMesure(
    itvCdn: number | null,
    ouvrageType: OuvrageTypeValue,
    ouvrageCode: string,
  ): Promise<PointMesure[]> {
    if (itvCdn === null) return [];

    if (ouvrageType === 'scl') {
      const authorizedScls = await this.listSystemesCollecte(itvCdn);
      const isAuthorized = authorizedScls.some((s) => s.sclSandreCda === ouvrageCode);
      if (!isAuthorized) return [];
    } else {
      const authorizedSteus = await this.listOuvrages(itvCdn);
      const isAuthorized = authorizedSteus.some((s) => s.steuSandreCda === ouvrageCode);
      if (!isAuthorized) return [];
    }

    return this.masaProvider.findPointsMesureByOuvrage(ouvrageType, ouvrageCode);
  }

  async listParametresMesure(
    itvCdn: number | null,
    ouvrageType: OuvrageTypeValue,
    ouvrageCode: string,
    pmoCdn: number,
  ): Promise<ParametreMesure[]> {
    if (itvCdn === null) return [];

    if (ouvrageType === 'scl') {
      const authorizedScls = await this.listSystemesCollecte(itvCdn);
      const isAuthorized = authorizedScls.some((s) => s.sclSandreCda === ouvrageCode);
      if (!isAuthorized) return [];
    } else {
      const authorizedSteus = await this.listOuvrages(itvCdn);
      const isAuthorized = authorizedSteus.some((s) => s.steuSandreCda === ouvrageCode);
      if (!isAuthorized) return [];
    }

    return this.masaProvider.findParametresByOuvrageAndPmo(ouvrageType, ouvrageCode, pmoCdn);
  }

  async listFinalites(): Promise<NomenclatureItem[]> {
    return this.masaProvider.findFinalites();
  }
}
