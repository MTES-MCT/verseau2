import { Inject, Injectable, LOG_LEVELS } from '@nestjs/common';
import { MasaProvider } from '@masa/masa.provider';
import {
  buildPointDeMesure,
  PaginatedMesuresResponse,
  PaginationQuery,
  MesuresSortByValue,
  type OuvrageTypeValue,
  mesurePropertyToHeaderMapper,
} from '@lib/dossier';
import { formatDate } from '@lib/shared';

import { CsvGenerator } from '@shared/csv/csv.types';
import {
  MesureFilters,
  SteuWithName,
  SclWithName,
  PointMesure,
  ParametreMesure,
  NomenclatureItem,
} from '@masa/masa.dto';
import { formatNullable } from '@shared/csv/csvFormatters';
import {
  buildCsvColumnsFromPropertyToHeaderMapper,
  type CsvFormattedRow,
} from '@shared/csv/propertyToHeaderCsvColumns';
import { PaginatedExportService } from '@shared/csv/paginatedExport.service';
import { TraceCalls } from '@shared/logger/traceCalls.decorator';

export interface ListMesuresOptions extends PaginationQuery {
  ouvrageType: OuvrageTypeValue;
  authorizedSteuCdas: string[];
  authorizedSclCdas: string[];
  ouvrageDepollutionCodes?: string[];
  systemeCollecteCodes?: string[];
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
  constructor(
    private readonly masaProvider: MasaProvider,
    private readonly paginatedExportService: PaginatedExportService,
    @Inject(CsvGenerator) private readonly csvGenerator: CsvGenerator,
  ) {}

  @TraceCalls(LOG_LEVELS[2])
  async listMesures(options: ListMesuresOptions): Promise<PaginatedMesuresResponse> {
    const {
      ouvrageType,
      authorizedSteuCdas,
      authorizedSclCdas,
      ouvrageDepollutionCodes: requestedOuvrages = [],
      systemeCollecteCodes: requestedSystemesCollecte = [],
      pmoCdn,
      parametreCode,
      qualification,
      statut,
      finalite,
      ...rest
    } = options;

    let filters: MesureFilters;

    if (ouvrageType === 'scl') {
      const systemeCollecteCodes =
        requestedSystemesCollecte.length > 0
          ? requestedSystemesCollecte.filter((code) => authorizedSclCdas.includes(code))
          : authorizedSclCdas;

      if (systemeCollecteCodes.length === 0) {
        return { data: [], total: 0, page: rest.page, pageSize: rest.pageSize };
      }

      filters = {
        ouvrageType: 'scl',
        ouvrageDepollutionCodes: [],
        systemeCollecteCodes,
        ...(pmoCdn !== undefined ? { pointMesureId: pmoCdn } : {}),
        ...(parametreCode ? { parametreAnalyseCode: parametreCode } : {}),
        ...(qualification ? { resultatAnalyseQualification: qualification } : {}),
        ...(statut ? { resultatAnalyseStatut: statut } : {}),
        ...(finalite ? { analyseFinalite: finalite } : {}),
        ...rest,
      };
    } else {
      const ouvrageDepollutionCodes =
        requestedOuvrages.length > 0
          ? requestedOuvrages.filter((code) => authorizedSteuCdas.includes(code))
          : authorizedSteuCdas;

      if (ouvrageDepollutionCodes.length === 0) {
        return { data: [], total: 0, page: rest.page, pageSize: rest.pageSize };
      }

      filters = {
        ouvrageType: 'steu',
        ouvrageDepollutionCodes,
        systemeCollecteCodes: [],
        ...(pmoCdn !== undefined ? { pointMesureId: pmoCdn } : {}),
        ...(parametreCode ? { parametreAnalyseCode: parametreCode } : {}),
        ...(qualification ? { resultatAnalyseQualification: qualification } : {}),
        ...(statut ? { resultatAnalyseStatut: statut } : {}),
        ...(finalite ? { analyseFinalite: finalite } : {}),
        ...rest,
      };
    }

    const { data, total } = await this.masaProvider.findMesures(filters);

    return {
      data: data.map((row) => ({ ...row, prelevementDate: row.prelevementDate })),
      total,
      page: rest.page,
      pageSize: rest.pageSize,
    };
  }

  @TraceCalls(LOG_LEVELS[2])
  async exportMesuresCsv(options: ListMesuresOptions): Promise<string> {
    const rows = await this.paginatedExportService.collectAllRows(async (page, pageSize) => {
      const result = await this.listMesures({ ...options, page, pageSize });
      return { data: result.data, total: result.total };
    });

    const formattedRows: CsvFormattedRow[] = rows.map((row) => ({
      prelevementDate: formatDate(row.prelevementDate),
      pointMesure: buildPointDeMesure(row),
      pointMesureLocalisationCode: formatNullable(row.pointMesureLocalisationCode),
      parametre: row.parametreNomCourt ?? row.parametreAnalyseCode,
      resultatAnalyseValeur: formatNullable(row.resultatAnalyseValeur),
      uniteMesureSymbole: formatNullable(row.uniteMesureSymbole),
      resultatAnalyseQualification: formatNullable(row.resultatAnalyseQualification),
      analyseFinalite: formatNullable(row.analyseFinalite),
      resultatAnalyseStatut: formatNullable(row.resultatAnalyseStatut),
    }));

    return this.csvGenerator.generate(
      buildCsvColumnsFromPropertyToHeaderMapper(mesurePropertyToHeaderMapper),
      formattedRows,
    );
  }

  @TraceCalls(LOG_LEVELS[2])
  async listOuvrages(authorizedSteuCdas: string[], search?: string): Promise<SteuWithName[]> {
    if (authorizedSteuCdas.length === 0) return [];

    if (search) {
      const normalizedLabel = search.trim();
      if (normalizedLabel.length < 2) {
        return [];
      }
      return this.masaProvider.findSteuWithNamesBySandreCdasAndLabel(authorizedSteuCdas, normalizedLabel);
    }

    return this.masaProvider.findSteuWithNamesBySandreCdas(authorizedSteuCdas);
  }

  @TraceCalls(LOG_LEVELS[2])
  async listSystemesCollecte(authorizedSclCdas: string[], search?: string): Promise<SclWithName[]> {
    if (authorizedSclCdas.length === 0) return [];

    if (search) {
      const normalizedLabel = search.trim();
      if (normalizedLabel.length < 2) {
        return [];
      }
      return this.masaProvider.findSclWithNamesBySandreCdasAndLabel(authorizedSclCdas, normalizedLabel);
    }

    return this.masaProvider.findSclWithNamesBySandreCdas(authorizedSclCdas);
  }

  @TraceCalls(LOG_LEVELS[2])
  async listPointsMesure(
    authorizedSteuCdas: string[],
    authorizedSclCdas: string[],
    ouvrageType: OuvrageTypeValue,
    ouvrageCode: string,
    filters?: { localisationCodes?: string[] },
  ): Promise<PointMesure[]> {
    if (ouvrageType === 'scl') {
      if (!authorizedSclCdas.includes(ouvrageCode)) return [];
    } else {
      if (!authorizedSteuCdas.includes(ouvrageCode)) return [];
    }

    return this.masaProvider.findPointsMesureByOuvrage(ouvrageType, ouvrageCode, filters);
  }

  @TraceCalls(LOG_LEVELS[2])
  async listParametresMesure(
    authorizedSteuCdas: string[],
    authorizedSclCdas: string[],
    ouvrageType: OuvrageTypeValue,
    ouvrageCode: string,
    pmoCdn?: number,
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
