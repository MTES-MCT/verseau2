import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  EvenementSclFilters,
  EvenementSteuFilters,
  EvenementSclRow,
  EvenementSteuRow,
  NomenclatureItem,
} from '@masa/masa.dto';
import { toISODateOrNull } from '@lib/shared';
import { TlrefEntity } from './entities/tlref.entity';
import { RoseauEvenementGateway } from './roseauEvenement.gateway';

interface EvenementSteuRawRow {
  pris_en_compte: boolean;
  date: Date | string;
  ouvrage_depollution_code: string;
  ouvrage_depollution_nom: string | null;
  type_evenement_code: string;
  type_evenement_libelle: string;
  finalite: string | null;
  commentaire: string | null;
}

interface EvenementSclRawRow extends EvenementSteuRawRow {
  systeme_collecte_code: string;
  systeme_collecte_nom: string | null;
  point_mesure_numero: string;
  point_mesure_libelle: string | null;
}

@Injectable()
export class RoseauEvenementRepository implements RoseauEvenementGateway {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TlrefEntity)
    private readonly tlrefRepository: Repository<TlrefEntity>,
  ) {}

  async findEvenementTypes(): Promise<NomenclatureItem[]> {
    const rows = await this.tlrefRepository
      .createQueryBuilder('tlref')
      .where('tlref.trl_rfa = :trlRfa', { trlRfa: 'LREF_46' })
      .andWhere('tlref.tlref_elt_cda IN (:...codes)', { codes: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] })
      .orderBy('tlref.tlref_elt_cda', 'ASC')
      .getMany();

    return rows.map((r) => ({
      elementNomenclatureCode: r.tlrefEltCda?.trim() ?? '',
      elementNomenclatureLibelle: r.tlrefMnemoLb?.trim() ?? null,
    }));
  }

  async findEvenementSteu(filters: EvenementSteuFilters): Promise<{ data: EvenementSteuRow[]; total: number }> {
    const { ouvrageDepollutionIds, year, page, pageSize, typeEvenementCodes } = filters;

    if (ouvrageDepollutionIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'date';
    const sortOrder = filters.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const sortMap: Record<NonNullable<EvenementSteuFilters['sortBy']>, string> = {
      date: 'date',
      typeEvenementCode: 'type_evenement_code',
      prisEnCompte: 'pris_en_compte',
      finalite: 'finalite',
    };

    const sortColumn = sortMap[sortBy];
    if (!sortColumn) {
      throw new Error(`Invalid sortBy value: "${sortBy}"`);
    }

    const queryParams: Array<number | string | boolean> = [];
    const addParam = (value: number | string | boolean) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    const yearPlaceholder = addParam(year);
    const steuPlaceholders = ouvrageDepollutionIds.map((cdn) => addParam(cdn)).join(', ');
    const typeEvenementPlaceholders = typeEvenementCodes.map((code) => addParam(code)).join(', ');
    const whereClauses = [
      `steu.steu_cdn IN (${steuPlaceholders})`,
      `date_part('year', evo.evo_evt_dt) = ${yearPlaceholder}`,
      `t46.tlref_elt_cda IN (${typeEvenementPlaceholders})`,
    ];

    if (filters.pointMesureId) {
      whereClauses.push(`evo.pmo_cdn = ${addParam(filters.pointMesureId)}`);
    }

    const baseQuery = `
      WITH base_data AS (
        SELECT
          evo.evo_inactif_on AS pris_en_compte,
          evo.evo_evt_dt AS date,
          steu.steu_sandre_cda AS ouvrage_depollution_code,
          steu.steu_nom_lb AS ouvrage_depollution_nom,
          t46.tlref_elt_cda AS type_evenement_code,
          t46.tlref_mnemo_lb AS type_evenement_libelle,
          t17.tlref_mnemo_lb AS finalite,
          evo.evo_desc_txt AS commentaire
        FROM roseau.evo evo
        JOIN roseau.steu steu ON steu.steu_cdn = evo.steu_cdn
        JOIN roseau.tlref t46 ON t46.tlref_cdn = evo.tlref_46_cdn
        LEFT JOIN roseau.tlref t17 ON t17.tlref_cdn = evo.tlref_17_cdn
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

    const rows = await this.dataSource.query<EvenementSteuRawRow[]>(
      `${baseQuery}
       SELECT * FROM base_data
       ORDER BY ${sortColumn} ${sortOrder}, date ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    return {
      data: rows.map((row) => ({
        prisEnCompte: row.pris_en_compte,
        date: toISODateOrNull(row.date) ?? '',
        ouvrageDepollutionCode: row.ouvrage_depollution_code?.trim() ?? '',
        ouvrageDepollutionNom: row.ouvrage_depollution_nom?.trim() ?? null,
        typeEvenementCode: row.type_evenement_code?.trim() ?? '',
        typeEvenementLibelle: row.type_evenement_libelle?.trim() ?? '',
        finalite: row.finalite?.trim() ?? null,
        commentaire: row.commentaire?.trim() ?? null,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findEvenementScl(filters: EvenementSclFilters): Promise<{ data: EvenementSclRow[]; total: number }> {
    const { systemeCollecteIds, year, page, pageSize, typeEvenementCodes } = filters;

    if (systemeCollecteIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'date';
    const sortOrder = filters.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const sortMap: Record<NonNullable<EvenementSclFilters['sortBy']>, string> = {
      date: 'date',
      typeEvenementCode: 'type_evenement_code',
      prisEnCompte: 'pris_en_compte',
      finalite: 'finalite',
      pointMesureNumero: 'point_mesure_numero',
    };

    const sortColumn = sortMap[sortBy];
    if (!sortColumn) {
      throw new Error(`Invalid sortBy value: "${sortBy}"`);
    }

    const queryParams: Array<number | string | boolean> = [];
    const addParam = (value: number | string | boolean) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    const yearPlaceholder = addParam(year);
    const sclPlaceholders = systemeCollecteIds.map((cdn) => addParam(cdn)).join(', ');
    const typeEvenementPlaceholders = typeEvenementCodes.map((code) => addParam(code)).join(', ');
    const whereClauses = [
      `scl.scl_cdn IN (${sclPlaceholders})`,
      `date_part('year', evo.evo_evt_dt) = ${yearPlaceholder}`,
      `t46.tlref_elt_cda IN (${typeEvenementPlaceholders})`,
    ];

    if (filters.pointMesureId) {
      whereClauses.push(`pmo.pmo_cdn = ${addParam(filters.pointMesureId)}`);
    }

    const baseQuery = `
      WITH base_data AS (
        SELECT
          evo.evo_inactif_on AS pris_en_compte,
          evo.evo_evt_dt AS date,
          steu.steu_sandre_cda AS ouvrage_depollution_code,
          steu.steu_nom_lb AS ouvrage_depollution_nom,
          scl.scl_sandre_cda AS systeme_collecte_code,
          scl.scl_lb AS systeme_collecte_nom,
          t46.tlref_elt_cda AS type_evenement_code,
          t46.tlref_mnemo_lb AS type_evenement_libelle,
          t17.tlref_mnemo_lb AS finalite,
          evo.evo_desc_txt AS commentaire,
          pmo.pmo_no AS point_mesure_numero,
          pmo.pmo_lb AS point_mesure_libelle
        FROM roseau.evo evo
        JOIN roseau.pmo pmo ON pmo.pmo_cdn = evo.pmo_cdn
        JOIN roseau.scl scl ON scl.scl_cdn = pmo.scl_cdn
        JOIN roseau.steu steu ON steu.steu_cdn = scl.steu_cdn
        JOIN roseau.tlref t46 ON t46.tlref_cdn = evo.tlref_46_cdn
        LEFT JOIN roseau.tlref t17 ON t17.tlref_cdn = evo.tlref_17_cdn
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

    const rows = await this.dataSource.query<EvenementSclRawRow[]>(
      `${baseQuery}
       SELECT * FROM base_data
       ORDER BY ${sortColumn} ${sortOrder}, date ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    return {
      data: rows.map((row) => ({
        prisEnCompte: row.pris_en_compte,
        date: toISODateOrNull(row.date) ?? '',
        ouvrageDepollutionCode: row.ouvrage_depollution_code?.trim() ?? '',
        ouvrageDepollutionNom: row.ouvrage_depollution_nom?.trim() ?? null,
        systemeCollecteCode: row.systeme_collecte_code?.trim() ?? '',
        systemeCollecteNom: row.systeme_collecte_nom?.trim() ?? null,
        typeEvenementCode: row.type_evenement_code?.trim() ?? '',
        typeEvenementLibelle: row.type_evenement_libelle?.trim() ?? '',
        finalite: row.finalite?.trim() ?? null,
        commentaire: row.commentaire?.trim() ?? null,
        pointMesureNumero: row.point_mesure_numero?.trim() ?? '',
        pointMesureLibelle: row.point_mesure_libelle?.trim() ?? null,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }
}
