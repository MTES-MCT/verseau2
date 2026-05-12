import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BilanSclFilters, BilanSclRow, BilanSteuFilters, BilanSteuRow } from '@masa/masa.dto';
import { RoseauBilanGateway } from './roseauBilan.gateway';
import { toISODateOrNull } from '@lib/shared';

interface BilanSteuRawRow {
  steu_cdn: number;
  ouvrage_depollution_code: string;
  date: Date | string;
  parametre_nom: string | null;
  bilan_spe_a: string;
  evt: 'Oui' | 'Non';
  hcnf: 'Oui' | 'Non';
  finalite: string | null;
}

interface BilanSclRawRow {
  scl_cdn: number;
  systeme_collecte_code: string;
  systeme_collecte_nom: string | null;
  point_mesure_identifiant: number;
  point_mesure_numero: string;
  point_mesure_libelle: string | null;
  date: Date | string;
  volume_deverse: number | null;
  temps_deversement: number | null;
  statut: 'TP' | 'TS';
}

@Injectable()
export class RoseauBilanRepository implements RoseauBilanGateway {
  constructor(private readonly dataSource: DataSource) {}

  async findBilanSteu(filters: BilanSteuFilters): Promise<{ data: BilanSteuRow[]; total: number }> {
    const { ouvrageDepollutionIds, year, page, pageSize } = filters;

    if (ouvrageDepollutionIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'date';
    const sortOrder = filters.sortOrder ?? 'ASC';

    const sortMap: Record<NonNullable<BilanSteuFilters['sortBy']>, string> = {
      date: 'date',
      ouvrageDepollutionCode: 'ouvrage_depollution_code',
      parametreNom: 'parametre_nom',
    };

    const sortColumn = sortMap[sortBy];
    if (!sortColumn) {
      throw new Error(`Invalid sortBy value: "${sortBy}"`);
    }

    const queryParams: Array<number | string | boolean | number[] | string[]> = [];
    const addParam = (value: number | string | boolean | number[] | string[]) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    const startDate = addParam(`${year}-01-01`);
    const endDate = addParam(`${year}-12-31`);
    const steuArrayParam = addParam(ouvrageDepollutionIds);
    const allowedParamCodesParam = addParam(filters.parametreCodes);
    const whereClauses = [
      `resj.resj_mes_dt >= ${startDate}`,
      `resj.resj_mes_dt <= ${endDate}`,
      `(resj.resj_jok_in = '2' OR resj.resj_aok_in = '2')`,
      `resj.par_rfa IN (SELECT unnest(${allowedParamCodesParam}::text[]))`,
    ];

    const baseQuery = `
      WITH base_data AS (
        SELECT
          steu.steu_cdn AS steu_cdn,
          RTRIM(steu.steu_sandre_cda) AS ouvrage_depollution_code,
          resj.resj_mes_dt::date AS date,
          par.par_court_nom_lb AS parametre_nom,
          resj.resj_aok_in AS bilan_spe_a, 
          CASE resj.resj_evt_in
            WHEN 'O' THEN 'Oui'
            ELSE 'Non'
          END AS evt,
          CASE resj.resj_hcnf_in
            WHEN 'O' THEN 'Non'
            ELSE 'Oui'
          END AS hcnf,
          t17.tlref_mnemo_lb AS finalite,
          resj.resj_jok_in AS prise_en_compte_j_code,
          resj.resj_aok_in AS prise_en_compte_a_code
        FROM roseau.resj resj
        JOIN roseau.steu steu ON steu.steu_cdn = resj.steu_cdn
        JOIN lanceleau.par par ON par.par_rfa = resj.par_rfa
        LEFT JOIN roseau.tlref t17 ON t17.tlref_cdn = resj.tlref_17_cdn
        WHERE ${whereClauses.join(' AND ')}
          AND steu.steu_cdn IN (SELECT unnest(${steuArrayParam}::int[]))
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery} SELECT COUNT(*)::int AS total FROM base_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<BilanSteuRawRow[]>(
      `${baseQuery}
        SELECT
          steu_cdn,
          ouvrage_depollution_code,
          bilan_spe_a,
          date,
          parametre_nom,
          hcnf,
          evt,
          finalite
       FROM base_data
       ORDER BY ${sortColumn} ${sortOrder}, date ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    return {
      data: rows.map((row) => ({
        steuCdn: row.steu_cdn,
        ouvrageDepollutionCode: row.ouvrage_depollution_code?.trim() ?? '',
        bilanEcarteParSpe: row.bilan_spe_a === '2',
        date: toISODateOrNull(row.date) ?? '',
        parametreNom: row.parametre_nom?.trim() ?? null,
        hcnf: row.hcnf,
        evt: row.evt,
        finalite: row.finalite?.trim() ?? null,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findBilanScl(filters: BilanSclFilters): Promise<{ data: BilanSclRow[]; total: number }> {
    const { systemeCollecteIds, year, page, pageSize, pointMesureId, statut } = filters;

    if (systemeCollecteIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'date';
    const sortOrder = filters.sortOrder ?? 'ASC';

    const sortMap: Record<NonNullable<BilanSclFilters['sortBy']>, string> = {
      date: 'date',
      systemeCollecteCode: 'systeme_collecte_code',
      pointMesureNumero: 'point_mesure_numero',
      statut: 'statut',
    };

    const sortColumn = sortMap[sortBy];
    if (!sortColumn) {
      throw new Error(`Invalid sortBy value: "${sortBy}"`);
    }

    const queryParams: Array<number | string | boolean | number[]> = [];
    const addParam = (value: number | string | boolean | number[]) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    const yearPlaceholder = addParam(year);
    const sclArrayParam = addParam(systemeCollecteIds);
    const whereClauses = [
      `scl.scl_cdn IN (SELECT unnest(${sclArrayParam}::int[]))`,
      `date_part('year', d.devers_dt) = ${yearPlaceholder}`,
      `d.devers_pris_en_compte_on = false`,
      `(d.devers_statut_in IN ('TP', 'TS') OR d.devers_statut_s_in IN ('TP', 'TS'))`,
    ];

    if (pointMesureId) {
      whereClauses.push(`pmo.pmo_cdn = ${addParam(pointMesureId)}`);
    }
    if (statut) {
      whereClauses.push(`
        (CASE
          WHEN d.devers_statut_in <> d.devers_statut_s_in THEN d.devers_statut_s_in
          ELSE d.devers_statut_in
        END) = ${addParam(statut)}
      `);
    }

    const baseQuery = `
      WITH base_data AS (
        SELECT
          scl.scl_cdn AS scl_cdn,
          RTRIM(scl.scl_sandre_cda) AS systeme_collecte_code,
          scl.scl_lb AS systeme_collecte_nom,
          pmo.pmo_cdn AS point_mesure_identifiant,
          pmo.pmo_no AS point_mesure_numero,
          pmo.pmo_lb AS point_mesure_libelle,
          d.devers_dt::date AS date,
          d.devers_vol_val AS volume_deverse,
          d.devers_temps_devers_val AS temps_deversement,
          CASE
            WHEN d.devers_statut_in <> d.devers_statut_s_in THEN d.devers_statut_s_in
            ELSE d.devers_statut_in
          END AS statut
        FROM roseau.devers d
        JOIN roseau.pmo pmo ON pmo.pmo_cdn = d.pmo_cdn
        JOIN roseau.scl scl ON scl.scl_cdn = pmo.scl_cdn
        WHERE ${whereClauses.join(' AND ')}
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery} SELECT COUNT(*)::int AS total FROM base_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<BilanSclRawRow[]>(
      `${baseQuery}
       SELECT
        scl_cdn,
        systeme_collecte_code,
        systeme_collecte_nom,
        point_mesure_identifiant,
        point_mesure_numero,
        point_mesure_libelle,
        date,
        volume_deverse,
        temps_deversement,
        statut
       FROM base_data
       ORDER BY ${sortColumn} ${sortOrder}, date ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    return {
      data: rows.map((row) => ({
        sclCdn: row.scl_cdn,
        systemeCollecteCode: row.systeme_collecte_code?.trim() ?? '',
        systemeCollecteNom: row.systeme_collecte_nom?.trim() ?? null,
        pointMesureId: row.point_mesure_identifiant,
        pointMesureNumero: row.point_mesure_numero?.trim() ?? '',
        pointMesureLibelle: row.point_mesure_libelle?.trim() ?? null,
        date: toISODateOrNull(row.date) ?? '',
        volumeDeverse: row.volume_deverse != null ? Number(row.volume_deverse) : null,
        tempsDeversement: row.temps_deversement != null ? Number(row.temps_deversement) : null,
        statut: row.statut,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }
}
