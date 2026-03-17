import { Injectable, LOG_LEVELS } from '@nestjs/common';
import { MasaProvider } from '@masa/masa.provider';
import { PaginatedMesuresResponse, PaginationQuery, MesuresSortByValue, OuvrageTypeValue } from '@lib/dossier';
import {
  MesureFilters,
  SteuWithName,
  SclWithName,
  PointMesure,
  ParametreMesure,
  NomenclatureItem,
} from '@masa/masa.dto';
import { TraceCalls } from '@shared/logger/traceCalls.decorator';

export interface ListMesuresOptions extends PaginationQuery {
  ouvrageType: OuvrageTypeValue;
  /** undefined = expert national, pas de filtrage d'autorisation */
  authorizedSteuCdas?: string[];
  /** undefined = expert national, pas de filtrage d'autorisation */
  authorizedSclCdas?: string[];
  steuSandreCdas?: string[];
  sclSandreCdas?: string[];
  pmoCdn?: number;
  dateDebut?: string;
  dateFin?: string;
  parametreCode?: string;
  qualification?: string;
  statut?: string;
  finalite?: string;
  sortBy?: MesuresSortByValue;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class MesuresService {
  constructor(private readonly masaProvider: MasaProvider) {}

  @TraceCalls(LOG_LEVELS[2])
  async listMesures(options: ListMesuresOptions): Promise<PaginatedMesuresResponse> {
    const {
      ouvrageType,
      authorizedSteuCdas,
      authorizedSclCdas,
      steuSandreCdas: requestedSteus = [],
      sclSandreCdas: requestedScls = [],
      ...rest
    } = options;

    let filters: MesureFilters;

    if (ouvrageType === 'scl') {
      const sclSandreCdas = this.resolveAuthorizedCodes(authorizedSclCdas, requestedScls);

      if (sclSandreCdas !== undefined && sclSandreCdas.length === 0) {
        return { data: [], total: 0, page: rest.page, pageSize: rest.pageSize };
      }

      filters = { ouvrageType: 'scl', steuSandreCdas: [], sclSandreCdas: sclSandreCdas ?? [], ...rest };
    } else {
      const steuSandreCdas = this.resolveAuthorizedCodes(authorizedSteuCdas, requestedSteus);

      if (steuSandreCdas !== undefined && steuSandreCdas.length === 0) {
        return { data: [], total: 0, page: rest.page, pageSize: rest.pageSize };
      }

      filters = { ouvrageType: 'steu', steuSandreCdas: steuSandreCdas ?? [], sclSandreCdas: [], ...rest };
    }

    const { data, total } = await this.masaProvider.findMesures(filters);

    return {
      data: data.map((row) => ({ ...row, date: row.date })),
      total,
      page: rest.page,
      pageSize: rest.pageSize,
    };
  }

  /** undefined = expert national, voit tout */
  async listOuvrages(authorizedSteuCdas?: string[]): Promise<SteuWithName[]> {
    if (authorizedSteuCdas === undefined) return this.masaProvider.findAllSteuWithNames();
    if (authorizedSteuCdas.length === 0) return [];
    return this.masaProvider.findSteuWithNamesBySandreCdas(authorizedSteuCdas);
  }

  /** undefined = expert national, voit tout */
  async listSystemesCollecte(authorizedSclCdas?: string[]): Promise<SclWithName[]> {
    if (authorizedSclCdas === undefined) return this.masaProvider.findAllSclWithNames();
    if (authorizedSclCdas.length === 0) return [];
    return this.masaProvider.findSclWithNamesBySandreCdas(authorizedSclCdas);
  }

  async listPointsMesure(
    authorizedSteuCdas: string[] | undefined,
    authorizedSclCdas: string[] | undefined,
    ouvrageType: OuvrageTypeValue,
    ouvrageCode: string,
  ): Promise<PointMesure[]> {
    if (ouvrageType === 'scl') {
      if (authorizedSclCdas !== undefined && !authorizedSclCdas.includes(ouvrageCode)) return [];
    } else {
      if (authorizedSteuCdas !== undefined && !authorizedSteuCdas.includes(ouvrageCode)) return [];
    }

    return this.masaProvider.findPointsMesureByOuvrage(ouvrageType, ouvrageCode);
  }

  async listParametresMesure(
    authorizedSteuCdas: string[] | undefined,
    authorizedSclCdas: string[] | undefined,
    ouvrageType: OuvrageTypeValue,
    ouvrageCode: string,
    pmoCdn: number,
  ): Promise<ParametreMesure[]> {
    if (ouvrageType === 'scl') {
      if (authorizedSclCdas !== undefined && !authorizedSclCdas.includes(ouvrageCode)) return [];
    } else {
      if (authorizedSteuCdas !== undefined && !authorizedSteuCdas.includes(ouvrageCode)) return [];
    }

    return this.masaProvider.findParametresByOuvrageAndPmo(ouvrageType, ouvrageCode, pmoCdn);
  }

  async listFinalites(): Promise<NomenclatureItem[]> {
    return this.masaProvider.findFinalites();
  }

  async listStatuts(): Promise<NomenclatureItem[]> {
    return this.masaProvider.findStatuts();
  }

  async listQualifications(): Promise<NomenclatureItem[]> {
    return this.masaProvider.findQualifications();
  }

  /**
   * Si authorizedCodes est undefined (expert national), renvoie undefined = pas de filtrage.
   * Sinon intersecte les codes demandés avec les codes autorisés.
   */
  private resolveAuthorizedCodes(
    authorizedCodes: string[] | undefined,
    requestedCodes: string[],
  ): string[] | undefined {
    if (authorizedCodes === undefined) return undefined;
    if (requestedCodes.length > 0) return requestedCodes.filter((cda) => authorizedCodes.includes(cda));
    return authorizedCodes;
  }
}
