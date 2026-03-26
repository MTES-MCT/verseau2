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
  authorizedSteuCdas: string[];
  authorizedSclCdas: string[];
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
      pmoCdn,
      parametreCode,
      qualification,
      statut,
      finalite,
      ...rest
    } = options;

    let filters: MesureFilters;

    if (ouvrageType === 'scl') {
      const sclSandreCdas =
        requestedScls.length > 0 ? requestedScls.filter((cda) => authorizedSclCdas.includes(cda)) : authorizedSclCdas;

      if (sclSandreCdas.length === 0) {
        return { data: [], total: 0, page: rest.page, pageSize: rest.pageSize };
      }

      filters = {
        ouvrageType: 'scl',
        steuSandreCdas: [],
        sclSandreCdas,
        ...(pmoCdn !== undefined ? { identifiantPointMesure: pmoCdn } : {}),
        ...(parametreCode ? { codeParametreAnalyse: parametreCode } : {}),
        ...(qualification ? { qualificationResultatAnalyse: qualification } : {}),
        ...(statut ? { statutResultatAnalyse: statut } : {}),
        ...(finalite ? { finaliteAnalyse: finalite } : {}),
        ...rest,
      };
    } else {
      const steuSandreCdas =
        requestedSteus.length > 0
          ? requestedSteus.filter((cda) => authorizedSteuCdas.includes(cda))
          : authorizedSteuCdas;

      if (steuSandreCdas.length === 0) {
        return { data: [], total: 0, page: rest.page, pageSize: rest.pageSize };
      }

      filters = {
        ouvrageType: 'steu',
        steuSandreCdas,
        sclSandreCdas: [],
        ...(pmoCdn !== undefined ? { identifiantPointMesure: pmoCdn } : {}),
        ...(parametreCode ? { codeParametreAnalyse: parametreCode } : {}),
        ...(qualification ? { qualificationResultatAnalyse: qualification } : {}),
        ...(statut ? { statutResultatAnalyse: statut } : {}),
        ...(finalite ? { finaliteAnalyse: finalite } : {}),
        ...rest,
      };
    }

    const { data, total } = await this.masaProvider.findMesures(filters);

    return {
      data: data.map((row) => ({ ...row, datePrelevement: row.datePrelevement })),
      total,
      page: rest.page,
      pageSize: rest.pageSize,
    };
  }

  async listOuvrages(authorizedSteuCdas: string[]): Promise<SteuWithName[]> {
    if (authorizedSteuCdas.length === 0) return [];
    return this.masaProvider.findSteuWithNamesBySandreCdas(authorizedSteuCdas);
  }

  async listSystemesCollecte(authorizedSclCdas: string[]): Promise<SclWithName[]> {
    if (authorizedSclCdas.length === 0) return [];
    return this.masaProvider.findSclWithNamesBySandreCdas(authorizedSclCdas);
  }

  async listPointsMesure(
    authorizedSteuCdas: string[],
    authorizedSclCdas: string[],
    ouvrageType: OuvrageTypeValue,
    ouvrageCode: string,
  ): Promise<PointMesure[]> {
    if (ouvrageType === 'scl') {
      if (!authorizedSclCdas.includes(ouvrageCode)) return [];
    } else {
      if (!authorizedSteuCdas.includes(ouvrageCode)) return [];
    }

    return this.masaProvider.findPointsMesureByOuvrage(ouvrageType, ouvrageCode);
  }

  async listParametresMesure(
    authorizedSteuCdas: string[],
    authorizedSclCdas: string[],
    ouvrageType: OuvrageTypeValue,
    ouvrageCode: string,
    pmoCdn: number,
  ): Promise<ParametreMesure[]> {
    if (ouvrageType === 'scl') {
      if (!authorizedSclCdas.includes(ouvrageCode)) return [];
    } else {
      if (!authorizedSteuCdas.includes(ouvrageCode)) return [];
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
}
