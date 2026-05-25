import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ConformiteSclDetailRow,
  ConformiteSclFilters,
  ConformiteSclRow,
  ConformiteSteuDetailRow,
  ConformiteSteuFilters,
  ConformiteSteuRow,
} from '@masa/masa.dto';
import { toISODateOrNull } from '@lib/shared';
import { RoseauConformiteGateway } from './roseauConformite.gateway';

interface ConformiteSteuRawRow {
  steu_cdn: number | string;
  ouvrage_depollution_code: string;
  ouvrage_depollution_nom: string | null;
  tranche_obligation_libelle: string | null;
  capacite_nominale_eh: number | string | null;
  suivi_debut_date: Date | string | null;
  suivi_fin_date: Date | string | null;
  conformite_nationale_provisoire: string | null;
  conformite_locale_provisoire: string | null;
  impact_conformite: boolean;
  suivi_regulier_effectue: boolean | null;
  suivi_regulier_date: Date | string | null;
}

interface ConformiteSclRawRow {
  scl_cdn: number | string;
  systeme_collecte_code: string;
  systeme_collecte_nom: string | null;
  tranche_obligation_libelle: string | null;
  type_scl: string | null;
  suivi_debut_date: Date | string | null;
  suivi_fin_date: Date | string | null;
  conformite_locale_temps_pluie_provisoire: string | null;
  conformite_nationale_temps_pluie_provisoire: string | null;
  impact_conformite: boolean;
  suivi_regulier_effectue: boolean | null;
  suivi_regulier_date: Date | string | null;
}

interface ConformiteSteuDetailRawRow {
  conf_loc_per_nb: number | string | null;
  conf_loc_an_nb: number | string | null;
  non_conf_loc_per_nb: number | string | null;
  non_conf_loc_an_nb: number | string | null;
  redh_loc_per_nb: number | string | null;
  redh_loc_an_nb: number | string | null;
  conf_loc_per_lb: string | null;
  conf_loc_an_lb: string | null;
  non_conf_loc_per_lb: string | null;
  non_conf_loc_an_lb: string | null;
  redh_loc_per_lb: string | null;
  redh_loc_an_lb: string | null;
  conf_nat_per_nb: number | string | null;
  conf_nat_an_nb: number | string | null;
  non_conf_nat_per_nb: number | string | null;
  non_conf_nat_an_nb: number | string | null;
  redh_nat_per_nb: number | string | null;
  redh_nat_an_nb: number | string | null;
  conf_nat_per_lb: string | null;
  conf_nat_an_lb: string | null;
  non_conf_nat_per_lb: string | null;
  non_conf_nat_an_lb: string | null;
  redh_nat_per_lb: string | null;
  redh_nat_an_lb: string | null;
  hcnf_per_nb: number | string | null;
  hcnf_an_nb: number | string | null;
  hcts_per_nb: number | string | null;
  hcts_an_nb: number | string | null;
  hcnf_per_lb: string | null;
  hcnf_an_lb: string | null;
  hcts_per_lb: string | null;
  hcts_an_lb: string | null;
  evt_per_nb: number | string | null;
  evt_an_nb: number | string | null;
}

interface ConformiteSclDetailRawRow {
  volume_deverse_periode_pc: number | string | null;
  volume_deverse_annee_pc: number | string | null;
  conformite_volume_periode: string | null;
  conformite_volume_annee: string | null;
  flux_deverse_periode_pc: number | string | null;
  flux_deverse_annee_pc: number | string | null;
  conformite_flux_periode: string | null;
  conformite_flux_annee: string | null;
  jours_deversement_periode_nb: number | string | null;
  jours_deversement_annee_nb: number | string | null;
  conformite_jours_deversement_periode: string | null;
  conformite_jours_deversement_annee: string | null;
}

@Injectable()
export class RoseauConformiteRepository implements RoseauConformiteGateway {
  constructor(private readonly dataSource: DataSource) {}

  async findConformiteSteu(filters: ConformiteSteuFilters): Promise<{ data: ConformiteSteuRow[]; total: number }> {
    const { ouvrageDepollutionIds, year, ouvrageDepollutionCode, trancheObligationRfa, impact, page, pageSize } =
      filters;

    if (ouvrageDepollutionIds.length === 0) {
      return { data: [], total: 0 };
    }

    const annee = year;
    const sortBy = filters.sortBy ?? 'ouvrageDepollutionCode';
    const sortOrder = filters.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const sortMap: Record<NonNullable<ConformiteSteuFilters['sortBy']>, string> = {
      ouvrageDepollutionCode: 'ouvrage_depollution_code',
      ouvrageDepollutionNom: 'ouvrage_depollution_nom',
      trancheObligationLibelle: 'tranche_obligation_libelle',
      capaciteNominaleEH: 'capacite_nominale_eh',
      conformiteNationaleProvisoire: 'conformite_nationale_provisoire',
      conformiteLocaleProvisoire: 'conformite_locale_provisoire',
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

    const anneePlaceholder = addParam(annee);
    const steuPlaceholders = ouvrageDepollutionIds.map((steuCdn) => addParam(steuCdn)).join(', ');
    const whereClauses = [`steu.steu_cdn IN (${steuPlaceholders})`];

    if (ouvrageDepollutionCode) {
      whereClauses.push(`RTRIM(steu.steu_sandre_cda) = ${addParam(ouvrageDepollutionCode)}`);
    }

    if (trancheObligationRfa) {
      whereClauses.push(`tltobl.tltobl_rfa = ${addParam(trancheObligationRfa)}`);
    }

    const impactFilter = impact ? `WHERE impact_conformite = ${addParam(impact === 'avec')}` : '';

    const baseQuery = `
      WITH params AS (SELECT ${anneePlaceholder}::int AS annee),
      base_data AS (
        SELECT
          steu.steu_cdn AS steu_cdn,
          RTRIM(steu.steu_sandre_cda) AS ouvrage_depollution_code,
          steu.steu_nom_lb AS ouvrage_depollution_nom,
          tltobl.tltobl_lb AS tranche_obligation_libelle,
          cpy.cpy_eh_trait_nom_cap_mt AS capacite_nominale_eh,
          steureg.steureg_suiv_deb_dt AS suivi_debut_date,
          steureg.steureg_suiv_fin_dt AS suivi_fin_date,
          cfprf.cfprf_r_glob_perf_eru_conf_in AS conformite_nationale_provisoire,
          cfprf.cfprf_r_glob_perf_loc_conf_in AS conformite_locale_provisoire,
          CASE
            WHEN cfprf.cfprf_r_glob_perf_eru_conf_in IS NULL
              AND cfprf.cfprf_r_glob_perf_loc_conf_in IS NULL
            THEN false
            WHEN cfprf.cfprf_r_glob_perf_eru_conf_in <> steureg.steureg_per_nat_conf_in
              OR cfprf.cfprf_r_glob_perf_loc_conf_in <> steureg.steureg_per_loc_conf_in
            THEN true
            ELSE false
          END AS impact_conformite,
          steureg.steureg_suivi_reg_on AS suivi_regulier_effectue,
          steureg.steureg_suivi_reg_dt AS suivi_regulier_date
        FROM roseau.steu steu
        JOIN roseau.cxntech cxn ON cxn.aval_steu_cdn = steu.steu_cdn
          AND cxn.amont_zgc_cdn IS NOT NULL
          AND DATE_PART('year', cxn.cxntech_creation_dt) <= (SELECT annee FROM params)
          AND (cxn.cxntech_retrait_dt IS NULL OR DATE_PART('year', cxn.cxntech_retrait_dt) >= (SELECT annee FROM params))
        JOIN roseau.aga aga ON aga.zgc_cdn = cxn.amont_zgc_cdn
        JOIN roseau.trobl trobl ON trobl.aga_cdn = aga.aga_cdn
          AND DATE_PART('year', trobl.trobl_val_deb_dt) <= (SELECT annee FROM params)
          AND (trobl.trobl_val_fin_dt IS NULL OR DATE_PART('year', trobl.trobl_val_fin_dt) >= (SELECT annee FROM params))
        JOIN roseau.tltobl tltobl ON tltobl.tltobl_rfa = trobl.tltobl_rfa
        JOIN roseau.cpy cpy ON cpy.steu_cdn = steu.steu_cdn
          AND ((cpy.cpy_an = (SELECT annee FROM params) AND steu.steu_encours_an = (SELECT annee FROM params))
            OR (cpy.cpy_an = steu.steu_encours_an AND steu.steu_encours_an < (SELECT annee FROM params)))
        JOIN roseau.cfprf cfprf ON cfprf.steu_cdn = steu.steu_cdn
          AND ((cfprf.cfprf_an = (SELECT annee FROM params) AND steu.steu_encours_an = (SELECT annee FROM params))
            OR (cfprf.cfprf_an = steu.steu_encours_an AND steu.steu_encours_an < (SELECT annee FROM params)))
        JOIN roseau.steureg steureg ON steureg.steu_cdn = steu.steu_cdn
          AND steureg.steureg_an = (SELECT annee FROM params)
        WHERE ${whereClauses.join(' AND ')}
      ),
      filtered_data AS (
        SELECT *
        FROM base_data
        ${impactFilter}
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery}
       SELECT COUNT(*)::int AS total
       FROM filtered_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<ConformiteSteuRawRow[]>(
      `${baseQuery}
       SELECT
         steu_cdn,
         ouvrage_depollution_code,
         ouvrage_depollution_nom,
         tranche_obligation_libelle,
         capacite_nominale_eh,
         suivi_debut_date,
         suivi_fin_date,
         conformite_nationale_provisoire,
         conformite_locale_provisoire,
         impact_conformite,
         suivi_regulier_effectue,
         suivi_regulier_date
       FROM filtered_data
       ORDER BY ${sortColumn} ${sortOrder}, ouvrage_depollution_code ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    return {
      data: rows.map((row) => ({
        steuCdn: Number(row.steu_cdn),
        ouvrageDepollutionCode: row.ouvrage_depollution_code?.trim() ?? '',
        ouvrageDepollutionNom: row.ouvrage_depollution_nom?.trim() ?? null,
        trancheObligationLibelle: row.tranche_obligation_libelle?.trim() ?? null,
        capaciteNominaleEH:
          row.capacite_nominale_eh !== null && row.capacite_nominale_eh !== undefined
            ? Number(row.capacite_nominale_eh)
            : null,
        suiviDebutDate: toISODateOrNull(row.suivi_debut_date),
        suiviFinDate: toISODateOrNull(row.suivi_fin_date),
        conformiteNationaleProvisoire: row.conformite_nationale_provisoire?.trim() ?? null,
        conformiteLocaleProvisoire: row.conformite_locale_provisoire?.trim() ?? null,
        impactConformite: row.impact_conformite,
        suiviRegulierEffectue: row.suivi_regulier_effectue,
        suiviRegulierDate: toISODateOrNull(row.suivi_regulier_date),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findConformiteScl(filters: ConformiteSclFilters): Promise<{ data: ConformiteSclRow[]; total: number }> {
    const { ouvrageDepollutionIds, year, systemeCollecteCode, trancheObligationRfa, impact, page, pageSize } = filters;

    if (ouvrageDepollutionIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'systemeCollecteCode';
    const sortOrder = filters.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const sortMap: Record<NonNullable<ConformiteSclFilters['sortBy']>, string> = {
      systemeCollecteCode: 'systeme_collecte_code',
      systemeCollecteNom: 'systeme_collecte_nom',
      trancheObligationLibelle: 'tranche_obligation_libelle',
      typeScl: 'type_scl',
      conformiteLocaleTempsPluieProvisoire: 'conformite_locale_temps_pluie_provisoire',
      conformiteNationaleTempsPluieProvisoire: 'conformite_nationale_temps_pluie_provisoire',
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

    const anneePlaceholder = addParam(year);
    const steuPlaceholders = ouvrageDepollutionIds.map((steuCdn) => addParam(steuCdn)).join(', ');
    const whereClauses = [`steu.steu_cdn IN (${steuPlaceholders})`];

    if (systemeCollecteCode) {
      whereClauses.push(`RTRIM(scl.scl_sandre_cda) = ${addParam(systemeCollecteCode)}`);
    }

    if (trancheObligationRfa) {
      whereClauses.push(`tltobl.tltobl_rfa = ${addParam(trancheObligationRfa)}`);
    }

    const impactFilter = impact ? `WHERE impact_conformite = ${addParam(impact === 'avec')}` : '';

    const baseQuery = `
      WITH params AS (SELECT ${anneePlaceholder}::int AS annee),
      base_data AS (
        SELECT
          scl.scl_cdn AS scl_cdn,
          RTRIM(scl.scl_sandre_cda) AS systeme_collecte_code,
          scl.scl_lb AS systeme_collecte_nom,
          tltobl.tltobl_lb AS tranche_obligation_libelle,
          t05.tlref_mnemo_lb AS type_scl,
          sclreg.sclreg_suiv_deb_dt AS suivi_debut_date,
          sclreg.sclreg_suiv_fin_dt AS suivi_fin_date,
          bil.bilanscl_conf_tp_eru_in AS conformite_locale_temps_pluie_provisoire,
          bil.bilanscl_conf_nat_tp_eru_in AS conformite_nationale_temps_pluie_provisoire,
          CASE
            WHEN bil.bilanscl_conf_tp_eru_in <> sclreg.sclreg_per_nat_tp_conf_in
            THEN true
            ELSE false
          END AS impact_conformite,
          sclreg.sclreg_suivi_reg_on AS suivi_regulier_effectue,
          sclreg.sclreg_suivi_reg_dt AS suivi_regulier_date
        FROM roseau.scl scl
        JOIN roseau.steu steu ON steu.steu_cdn = scl.steu_cdn
        JOIN roseau.cxntech cxn ON cxn.aval_steu_cdn = steu.steu_cdn
          AND cxn.amont_zgc_cdn IS NOT NULL
          AND DATE_PART('year', cxn.cxntech_creation_dt) <= (SELECT annee FROM params)
          AND (cxn.cxntech_retrait_dt IS NULL OR DATE_PART('year', cxn.cxntech_retrait_dt) >= (SELECT annee FROM params))
        JOIN roseau.aga aga ON aga.zgc_cdn = cxn.amont_zgc_cdn
        JOIN roseau.trobl trobl ON trobl.aga_cdn = aga.aga_cdn
          AND DATE_PART('year', trobl.trobl_val_deb_dt) <= (SELECT annee FROM params)
          AND (trobl.trobl_val_fin_dt IS NULL OR DATE_PART('year', trobl.trobl_val_fin_dt) >= (SELECT annee FROM params))
        JOIN roseau.tltobl tltobl ON tltobl.tltobl_rfa = trobl.tltobl_rfa
        JOIN roseau.tlref t05 ON t05.tlref_cdn = scl.tlref_05_cdn
        JOIN roseau.bilanscl bil ON bil.scl_cdn = scl.scl_cdn
          AND bil.bilanscl_an = (SELECT annee FROM params)
        JOIN roseau.sclreg sclreg ON sclreg.scl_cdn = scl.scl_cdn
          AND sclreg.sclreg_an = (SELECT annee FROM params)
          AND NOT sclreg.sclreg_suivi_reg_on
        WHERE ${whereClauses.join(' AND ')}
      ),
      filtered_data AS (
        SELECT *
        FROM base_data
        ${impactFilter}
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery}
       SELECT COUNT(*)::int AS total
       FROM filtered_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<ConformiteSclRawRow[]>(
      `${baseQuery}
       SELECT
         scl_cdn,
         systeme_collecte_code,
         systeme_collecte_nom,
         tranche_obligation_libelle,
         type_scl,
         suivi_debut_date,
         suivi_fin_date,
         conformite_locale_temps_pluie_provisoire,
         conformite_nationale_temps_pluie_provisoire,
         impact_conformite,
         suivi_regulier_effectue,
         suivi_regulier_date
       FROM filtered_data
       ORDER BY ${sortColumn} ${sortOrder}, systeme_collecte_code ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    return {
      data: rows.map((row) => ({
        sclCdn: Number(row.scl_cdn),
        systemeCollecteCode: row.systeme_collecte_code?.trim() ?? '',
        systemeCollecteNom: row.systeme_collecte_nom?.trim() ?? null,
        trancheObligationLibelle: row.tranche_obligation_libelle?.trim() ?? null,
        typeScl: row.type_scl?.trim() ?? null,
        suiviDebutDate: toISODateOrNull(row.suivi_debut_date),
        suiviFinDate: toISODateOrNull(row.suivi_fin_date),
        conformiteLocaleTempsPluieProvisoire: row.conformite_locale_temps_pluie_provisoire?.trim() ?? null,
        conformiteNationaleTempsPluieProvisoire: row.conformite_nationale_temps_pluie_provisoire?.trim() ?? null,
        impactConformite: row.impact_conformite,
        suiviRegulierEffectue: row.suivi_regulier_effectue,
        suiviRegulierDate: toISODateOrNull(row.suivi_regulier_date),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findConformiteSteuDetail(steuCdn: number, annee: number): Promise<ConformiteSteuDetailRow | null> {
    const rows = await this.dataSource.query<ConformiteSteuDetailRawRow[]>(
      `SELECT
        steureg.steureg_conf_loc_per_nb     AS conf_loc_per_nb,
        steureg.steureg_conf_loc_an_nb      AS conf_loc_an_nb,
        steureg.steureg_non_conf_loc_per_nb AS non_conf_loc_per_nb,
        steureg.steureg_non_conf_loc_an_nb  AS non_conf_loc_an_nb,
        steureg.steureg_redh_loc_per_nb     AS redh_loc_per_nb,
        steureg.steureg_redh_loc_an_nb      AS redh_loc_an_nb,
        steureg.steureg_conf_loc_per_lb     AS conf_loc_per_lb,
        steureg.steureg_conf_loc_an_lb      AS conf_loc_an_lb,
        steureg.steureg_non_conf_loc_per_lb AS non_conf_loc_per_lb,
        steureg.steureg_non_conf_loc_an_lb  AS non_conf_loc_an_lb,
        steureg.steureg_redh_loc_per_lb     AS redh_loc_per_lb,
        steureg.steureg_redh_loc_an_lb      AS redh_loc_an_lb,
        steureg.steureg_conf_nat_per_nb     AS conf_nat_per_nb,
        steureg.steureg_conf_nat_an_nb      AS conf_nat_an_nb,
        steureg.steureg_non_conf_nat_per_nb AS non_conf_nat_per_nb,
        steureg.steureg_non_conf_nat_an_nb  AS non_conf_nat_an_nb,
        steureg.steureg_redh_nat_per_nb     AS redh_nat_per_nb,
        steureg.steureg_redh_nat_an_nb      AS redh_nat_an_nb,
        steureg.steureg_conf_nat_per_lb     AS conf_nat_per_lb,
        steureg.steureg_conf_nat_an_lb      AS conf_nat_an_lb,
        steureg.steureg_non_conf_nat_per_lb AS non_conf_nat_per_lb,
        steureg.steureg_non_conf_nat_an_lb  AS non_conf_nat_an_lb,
        steureg.steureg_redh_nat_per_lb     AS redh_nat_per_lb,
        steureg.steureg_redh_nat_an_lb      AS redh_nat_an_lb,
        steureg.steureg_hcnf_per_nb         AS hcnf_per_nb,
        steureg.steureg_hcnf_an_nb          AS hcnf_an_nb,
        steureg.steureg_hcts_per_nb         AS hcts_per_nb,
        steureg.steureg_hcts_an_nb          AS hcts_an_nb,
        steureg.steureg_hcnf_per_lb         AS hcnf_per_lb,
        steureg.steureg_hcnf_an_lb          AS hcnf_an_lb,
        steureg.steureg_hcts_per_lb         AS hcts_per_lb,
        steureg.steureg_hcts_an_lb          AS hcts_an_lb,
        steureg.steureg_evt_per_nb          AS evt_per_nb,
        steureg.steureg_evt_an_nb           AS evt_an_nb
      FROM roseau.steureg steureg
      WHERE steureg.steu_cdn = $1
      AND   steureg.steureg_an = $2;`,
      [steuCdn, annee],
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    const toNullableNumber = (value: number | string | null) => (value !== null ? Number(value) : null);
    const toNullableString = (value: string | null) => value?.trim() ?? null;

    return {
      conformiteLocaleParametresConformesPeriodeNb: toNullableNumber(row.conf_loc_per_nb),
      conformiteLocaleParametresConformesAnneeNb: toNullableNumber(row.conf_loc_an_nb),
      conformiteLocaleParametresNonConformesPeriodeNb: toNullableNumber(row.non_conf_loc_per_nb),
      conformiteLocaleParametresNonConformesAnneeNb: toNullableNumber(row.non_conf_loc_an_nb),
      conformiteLocaleRedhibitoiresPeriodeNb: toNullableNumber(row.redh_loc_per_nb),
      conformiteLocaleRedhibitoiresAnneeNb: toNullableNumber(row.redh_loc_an_nb),
      conformiteLocaleParametresConformesPeriodeLb: toNullableString(row.conf_loc_per_lb),
      conformiteLocaleParametresConformesAnneeLb: toNullableString(row.conf_loc_an_lb),
      conformiteLocaleParametresNonConformesPeriodeLb: toNullableString(row.non_conf_loc_per_lb),
      conformiteLocaleParametresNonConformesAnneeLb: toNullableString(row.non_conf_loc_an_lb),
      conformiteLocaleRedhibitoiresPeriodeLb: toNullableString(row.redh_loc_per_lb),
      conformiteLocaleRedhibitoiresAnneeLb: toNullableString(row.redh_loc_an_lb),
      conformiteNationaleParametresConformesPeriodeNb: toNullableNumber(row.conf_nat_per_nb),
      conformiteNationaleParametresConformesAnneeNb: toNullableNumber(row.conf_nat_an_nb),
      conformiteNationaleParametresNonConformesPeriodeNb: toNullableNumber(row.non_conf_nat_per_nb),
      conformiteNationaleParametresNonConformesAnneeNb: toNullableNumber(row.non_conf_nat_an_nb),
      conformiteNationaleRedhibitoiresPeriodeNb: toNullableNumber(row.redh_nat_per_nb),
      conformiteNationaleRedhibitoiresAnneeNb: toNullableNumber(row.redh_nat_an_nb),
      conformiteNationaleParametresConformesPeriodeLb: toNullableString(row.conf_nat_per_lb),
      conformiteNationaleParametresConformesAnneeLb: toNullableString(row.conf_nat_an_lb),
      conformiteNationaleParametresNonConformesPeriodeLb: toNullableString(row.non_conf_nat_per_lb),
      conformiteNationaleParametresNonConformesAnneeLb: toNullableString(row.non_conf_nat_an_lb),
      conformiteNationaleRedhibitoiresPeriodeLb: toNullableString(row.redh_nat_per_lb),
      conformiteNationaleRedhibitoiresAnneeLb: toNullableString(row.redh_nat_an_lb),
      hcnfPeriodeNb: toNullableNumber(row.hcnf_per_nb),
      hcnfAnneeNb: toNullableNumber(row.hcnf_an_nb),
      hctsPeriodeNb: toNullableNumber(row.hcts_per_nb),
      hctsAnneeNb: toNullableNumber(row.hcts_an_nb),
      hcnfPeriodeLb: toNullableString(row.hcnf_per_lb),
      hcnfAnneeLb: toNullableString(row.hcnf_an_lb),
      hctsPeriodeLb: toNullableString(row.hcts_per_lb),
      hctsAnneeLb: toNullableString(row.hcts_an_lb),
      evenementsPeriodeNb: toNullableNumber(row.evt_per_nb),
      evenementsAnneeNb: toNullableNumber(row.evt_an_nb),
    };
  }

  async findConformiteSclDetail(sclCdn: number, annee: number): Promise<ConformiteSclDetailRow | null> {
    const rows = await this.dataSource.query<ConformiteSclDetailRawRow[]>(
      `SELECT
        sclreg.sclreg_per_vol_dev_pc       AS volume_deverse_periode_pc,
        sclreg.sclreg_an_vol_dev_pc        AS volume_deverse_annee_pc,
        sclreg.sclreg_per_conf_vol_dev_in  AS conformite_volume_periode,
        sclreg.sclreg_an_conf_vol_dev_in   AS conformite_volume_annee,
        sclreg.sclreg_per_flux_dev_pc      AS flux_deverse_periode_pc,
        sclreg.sclreg_an_flux_dev_pc       AS flux_deverse_annee_pc,
        sclreg.sclreg_per_conf_flux_dev_in AS conformite_flux_periode,
        sclreg.sclreg_an_conf_flux_dev_in  AS conformite_flux_annee,
        sclreg.sclreg_per_jour_dev_nb      AS jours_deversement_periode_nb,
        sclreg.sclreg_an_jour_dev_nb       AS jours_deversement_annee_nb,
        sclreg.sclreg_per_conf_jour_dev_in AS conformite_jours_deversement_periode,
        sclreg.sclreg_an_conf_jour_dev_in  AS conformite_jours_deversement_annee
      FROM roseau.sclreg
      WHERE sclreg.scl_cdn = $1
      AND sclreg.sclreg_an = $2;`,
      [sclCdn, annee],
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    const toNullableNumber = (value: number | string | null) => (value !== null ? Number(value) : null);
    const toNullableString = (value: string | null) => value?.trim() ?? null;

    return {
      volumeDeversePeriodePc: toNullableNumber(row.volume_deverse_periode_pc),
      volumeDeverseAnneePc: toNullableNumber(row.volume_deverse_annee_pc),
      conformiteVolumePeriode: toNullableString(row.conformite_volume_periode),
      conformiteVolumeAnnee: toNullableString(row.conformite_volume_annee),
      fluxDeversePeriodePc: toNullableNumber(row.flux_deverse_periode_pc),
      fluxDeverseAnneePc: toNullableNumber(row.flux_deverse_annee_pc),
      conformiteFluxPeriode: toNullableString(row.conformite_flux_periode),
      conformiteFluxAnnee: toNullableString(row.conformite_flux_annee),
      joursDeversementPeriodeNb: toNullableNumber(row.jours_deversement_periode_nb),
      joursDeversementAnneeNb: toNullableNumber(row.jours_deversement_annee_nb),
      conformiteJoursDeversementPeriode: toNullableString(row.conformite_jours_deversement_periode),
      conformiteJoursDeversementAnnee: toNullableString(row.conformite_jours_deversement_annee),
    };
  }
}
