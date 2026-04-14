import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RoseauTransmissionGateway } from './roseauTransmission.gateway';
import {
  TransmissionASRetardSteuFilters,
  TransmissionASRetardSteuRow,
  TransmissionASRetardSclFilters,
  TransmissionASRetardSclRow,
} from '@masa/masa.dto';

interface TransmissionASRetardSteuRawRow {
  code_sandre: string;
  nom: string | null;
  tranche_obligation: string | null;
  capacite_nominale: number | null;
  nb_fichiers_as_recus: number | null;
  date_dernier_fichier_recu: Date | string | null;
  date_debut_periode: Date | string | null;
  date_fin_periode: Date | string | null;
  date_mesure_suivante_attendue: Date | string | null;
  nb_jours_retard: number | null;
  exploitant_nom: string | null;
  exploitant_email: string | null;
  exploitant_date_envoi_mail: Date | string | null;
}

type TransmissionASRetardSclRawRow = TransmissionASRetardSteuRawRow;

@Injectable()
export class RoseauTransmissionRepository implements RoseauTransmissionGateway {
  constructor(private readonly dataSource: DataSource) {}

  async findTransmissionASRetardSteu(
    filters: TransmissionASRetardSteuFilters,
  ): Promise<{ data: TransmissionASRetardSteuRow[]; total: number }> {
    const { ouvrageDepollutionIds, year, page, pageSize } = filters;

    if (ouvrageDepollutionIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'nbJoursRetard';
    const sortOrder = filters.sortOrder ?? 'DESC';

    const sortMap: Record<NonNullable<TransmissionASRetardSteuFilters['sortBy']>, string> = {
      nbJoursRetard: 'nb_jours_retard',
      ouvrageDepollutionCode: 'code_sandre',
      ouvrageDepollutionNom: 'nom',
      trancheObligationLibelle: 'tranche_obligation',
      capaciteNominaleEH: 'capacite_nominale',
      dateDernierFichierRecu: 'date_dernier_fichier_recu',
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
    const steuPlaceholders = ouvrageDepollutionIds.map((cdn) => addParam(cdn)).join(', ');
    const anneeDebut = addParam(`${year}-01-01`);
    const anneeFin = addParam(`${year}-12-31`);
    const anneeSuivante = addParam(`${year + 1}-01-01`);
    const dateFallback = addParam(`${year}-01-01`);
    const dateFallbackRetard = addParam(`${year}-02-01`);

    const whereClauses = [`steu.steu_cdn IN (${steuPlaceholders})`];

    const baseQuery = `
      WITH params AS (SELECT ${anneePlaceholder}::int AS annee),
      base_data AS (
        SELECT
          RTRIM(steu.steu_sandre_cda)         AS code_sandre,
          steu.steu_nom_lb                    AS nom,
          tltobl.tltobl_lb                    AS tranche_obligation,
          cpy.cpy_eh_trait_nom_cap_mt         AS capacite_nominale,
          qual.suivqual_fic_nb               AS nb_fichiers_as_recus,
          qual.suivqual_der_trans_dt::date   AS date_dernier_fichier_recu,
          det.v_dep_suiv_reg_ref_deb_dt::date AS date_debut_periode,
          det.v_dep_suiv_reg_ref_fin_dt::date AS date_fin_periode,
          CASE
            WHEN reg.steureg_suiv_fin_dt IS NOT NULL
            THEN date_trunc('month', reg.steureg_suiv_fin_dt + interval '1 month')::date
            ELSE ${dateFallback}::date
          END AS date_mesure_suivante_attendue,
          CASE
            WHEN reg.steureg_suiv_fin_dt IS NOT NULL
            THEN date_part('day',
              NOW() - date_trunc('month', reg.steureg_suiv_fin_dt + interval '1 month')::date
            )
            ELSE extract(day FROM (NOW() - ${dateFallbackRetard}::date))
          END AS nb_jours_retard,
          itv.itv_mnemo_lb                    AS exploitant_nom,
          adr.adr_mail_lb                     AS exploitant_email,
          reg.steureg_mail_expl_dt            AS exploitant_date_envoi_mail
        FROM roseau.steu steu
        JOIN roseau.cxntech cxn
          ON cxn.aval_steu_cdn = steu.steu_cdn
          AND cxn.amont_zgc_cdn IS NOT NULL
          AND date_part('year', cxn.cxntech_creation_dt) <= (SELECT annee FROM params)
          AND (
            cxn.cxntech_retrait_dt IS NULL
            OR date_part('year', cxn.cxntech_retrait_dt) >= (SELECT annee FROM params)
          )
        JOIN roseau.aga aga
          ON aga.zgc_cdn = cxn.amont_zgc_cdn
        JOIN roseau.trobl trobl
          ON trobl.aga_cdn = aga.aga_cdn
          AND date_part('year', trobl.trobl_val_deb_dt) <= (SELECT annee FROM params)
          AND (
            trobl.trobl_val_fin_dt IS NULL
            OR date_part('year', trobl.trobl_val_fin_dt) >= (SELECT annee FROM params)
          )
        JOIN roseau.tltobl tltobl
          ON tltobl.tltobl_rfa = trobl.tltobl_rfa
        JOIN roseau.cpy cpy
          ON cpy.steu_cdn = steu.steu_cdn
          AND (
            (cpy.cpy_an = (SELECT annee FROM params) AND steu.steu_encours_an = (SELECT annee FROM params))
            OR (cpy.cpy_an = steu.steu_encours_an AND steu.steu_encours_an < (SELECT annee FROM params))
          )
        JOIN roseau.steureg reg
          ON reg.steu_cdn = steu.steu_cdn
          AND reg.steureg_an = (SELECT annee FROM params)
        JOIN roseau.suivqual qual
          ON qual.steu_cdn = steu.steu_cdn
          AND qual.suivqual_an = (SELECT annee FROM params)
        LEFT OUTER JOIN verseau.v_dep_suiv_reg det
          ON det.v_dep_cdn = reg.v_dep_cdn
        LEFT OUTER JOIN roseau.cxnadm exp
          ON exp.exp_steu_cdn = steu.steu_cdn
          AND exp.steu_itv_cdn IS NOT NULL
          AND (
            exp.cxnadm_creation_dt IS NULL
            OR exp.cxnadm_creation_dt <= ${anneeDebut}::date
          )
          AND (
            exp.cxnadm_retrait_dt IS NULL
            OR exp.cxnadm_retrait_dt > ${anneeFin}::date
          )
        LEFT OUTER JOIN lanceleau.itv itv
          ON itv.itv_cdn = exp.steu_itv_cdn
        LEFT OUTER JOIN lanceleau.adr adr
          ON adr.adr_cdn = itv.adr_cdn
        WHERE ${whereClauses.join(' AND ')}
      ),
      filtered_data AS (
        SELECT *
        FROM base_data
        WHERE nb_jours_retard > 0
          AND date_mesure_suivante_attendue < ${anneeSuivante}::date
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery} SELECT COUNT(*)::int AS total FROM filtered_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<TransmissionASRetardSteuRawRow[]>(
      `${baseQuery}
       SELECT
         code_sandre,
         nom,
         tranche_obligation,
         capacite_nominale,
         nb_fichiers_as_recus,
         date_dernier_fichier_recu,
         date_debut_periode,
         date_fin_periode,
         date_mesure_suivante_attendue,
         nb_jours_retard,
         exploitant_nom,
         exploitant_email,
         exploitant_date_envoi_mail
       FROM filtered_data
       ORDER BY ${sortColumn} ${sortOrder}, code_sandre ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    const formatDate = (value: Date | string | null) => {
      if (!value) return null;
      return typeof value === 'string' ? value.split('T')[0] : value.toISOString().split('T')[0];
    };

    return {
      data: rows.map((row) => ({
        ouvrageDepollutionCode: row.code_sandre?.trim() ?? '',
        ouvrageDepollutionNom: row.nom?.trim() ?? null,
        trancheObligationLibelle: row.tranche_obligation?.trim() ?? null,
        capaciteNominaleEH: row.capacite_nominale != null ? Number(row.capacite_nominale) : null,
        nbFichiersAsRecus: row.nb_fichiers_as_recus != null ? Number(row.nb_fichiers_as_recus) : null,
        dateDernierFichierRecu: formatDate(row.date_dernier_fichier_recu),
        dateDebutPeriode: formatDate(row.date_debut_periode),
        dateFinPeriode: formatDate(row.date_fin_periode),
        dateMesureSuivanteAttendue: formatDate(row.date_mesure_suivante_attendue),
        nbJoursRetard: row.nb_jours_retard != null ? Number(row.nb_jours_retard) : null,
        exploitantNom: row.exploitant_nom?.trim() ?? null,
        exploitantEmail: row.exploitant_email?.trim() ?? null,
        exploitantDateEnvoiMail: formatDate(row.exploitant_date_envoi_mail),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findTransmissionASRetardScl(
    filters: TransmissionASRetardSclFilters,
  ): Promise<{ data: TransmissionASRetardSclRow[]; total: number }> {
    const { systemeCollecteIds, year, page, pageSize } = filters;

    if (systemeCollecteIds.length === 0) {
      return { data: [], total: 0 };
    }

    const sortBy = filters.sortBy ?? 'nbJoursRetard';
    const sortOrder = filters.sortOrder ?? 'DESC';

    const sortMap: Record<NonNullable<TransmissionASRetardSclFilters['sortBy']>, string> = {
      nbJoursRetard: 'nb_jours_retard',
      systemeCollecteCode: 'code_sandre',
      systemeCollecteNom: 'nom',
      trancheObligationLibelle: 'tranche_obligation',
      capaciteNominaleEH: 'capacite_nominale',
      dateDernierFichierRecu: 'date_dernier_fichier_recu',
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
    const sclPlaceholders = systemeCollecteIds.map((cdn) => addParam(cdn)).join(', ');
    const anneeDebut = addParam(`${year}-01-01`);
    const anneeFin = addParam(`${year}-12-31`);
    const anneeSuivante = addParam(`${year + 1}-01-01`);
    const dateFallback = addParam(`${year}-01-01`);
    const dateFallbackRetard = addParam(`${year}-02-01`);

    const whereClauses = [`scl.scl_cdn IN (${sclPlaceholders})`];

    const baseQuery = `
      WITH params AS (SELECT ${anneePlaceholder}::int AS annee),
      base_data AS (
        SELECT
          RTRIM(scl.scl_sandre_cda)           AS code_sandre,
          scl.scl_lb                          AS nom,
          tltobl.tltobl_lb                    AS tranche_obligation,
          cpy.cpy_eh_trait_nom_cap_mt         AS capacite_nominale,
          qual.suivqual_fic_nb               AS nb_fichiers_as_recus,
          qual.suivqual_der_trans_dt::date   AS date_dernier_fichier_recu,
          det.v_dep_suiv_reg_ref_deb_dt::date AS date_debut_periode,
          det.v_dep_suiv_reg_ref_fin_dt::date AS date_fin_periode,
          CASE
            WHEN reg.sclreg_suiv_fin_dt IS NOT NULL
            THEN date_trunc('month', reg.sclreg_suiv_fin_dt + interval '1 month')::date
            ELSE ${dateFallback}::date
          END AS date_mesure_suivante_attendue,
          CASE
            WHEN reg.sclreg_suiv_fin_dt IS NOT NULL
            THEN date_part('day',
              NOW() - date_trunc('month', reg.sclreg_suiv_fin_dt + interval '1 month')::date
            )
            ELSE extract(day FROM (NOW() - ${dateFallbackRetard}::date))
          END AS nb_jours_retard,
          itv.itv_mnemo_lb                    AS exploitant_nom,
          adr.adr_mail_lb                     AS exploitant_email,
          reg.sclreg_mail_expl_dt             AS exploitant_date_envoi_mail
        FROM roseau.scl scl
        JOIN roseau.steu steu
          ON steu.steu_cdn = scl.steu_cdn
        JOIN roseau.cxntech cxn
          ON cxn.aval_steu_cdn = steu.steu_cdn
          AND cxn.amont_zgc_cdn IS NOT NULL
          AND date_part('year', cxn.cxntech_creation_dt) <= (SELECT annee FROM params)
          AND (
            cxn.cxntech_retrait_dt IS NULL
            OR date_part('year', cxn.cxntech_retrait_dt) >= (SELECT annee FROM params)
          )
        JOIN roseau.aga aga
          ON aga.zgc_cdn = cxn.amont_zgc_cdn
        JOIN roseau.trobl trobl
          ON trobl.aga_cdn = aga.aga_cdn
          AND date_part('year', trobl.trobl_val_deb_dt) <= (SELECT annee FROM params)
          AND (
            trobl.trobl_val_fin_dt IS NULL
            OR date_part('year', trobl.trobl_val_fin_dt) >= (SELECT annee FROM params)
          )
        JOIN roseau.tltobl tltobl
          ON tltobl.tltobl_rfa = trobl.tltobl_rfa
        JOIN roseau.cpy cpy
          ON cpy.steu_cdn = steu.steu_cdn
          AND (
            (cpy.cpy_an = (SELECT annee FROM params) AND steu.steu_encours_an = (SELECT annee FROM params))
            OR (cpy.cpy_an = steu.steu_encours_an AND steu.steu_encours_an < (SELECT annee FROM params))
          )
        JOIN roseau.sclreg reg
          ON reg.scl_cdn = scl.scl_cdn
          AND reg.sclreg_an = (SELECT annee FROM params)
        JOIN roseau.suivqual qual
          ON qual.scl_cdn = scl.scl_cdn
          AND qual.suivqual_an = (SELECT annee FROM params)
        LEFT OUTER JOIN verseau.v_dep_suiv_reg det
          ON det.v_dep_cdn = reg.v_dep_cdn
        LEFT OUTER JOIN roseau.cxnadm exp
          ON exp.exp_steu_cdn = steu.steu_cdn
          AND exp.steu_itv_cdn IS NOT NULL
          AND (
            exp.cxnadm_creation_dt IS NULL
            OR exp.cxnadm_creation_dt <= ${anneeDebut}::date
          )
          AND (
            exp.cxnadm_retrait_dt IS NULL
            OR exp.cxnadm_retrait_dt > ${anneeFin}::date
          )
        LEFT OUTER JOIN lanceleau.itv itv
          ON itv.itv_cdn = exp.steu_itv_cdn
        LEFT OUTER JOIN lanceleau.adr adr
          ON adr.adr_cdn = itv.adr_cdn
        WHERE ${whereClauses.join(' AND ')}
      ),
      filtered_data AS (
        SELECT *
        FROM base_data
        WHERE nb_jours_retard > 0
          AND date_mesure_suivante_attendue < ${anneeSuivante}::date
      )
    `;

    const countRows = await this.dataSource.query<{ total: number | string }[]>(
      `${baseQuery} SELECT COUNT(*)::int AS total FROM filtered_data`,
      queryParams,
    );

    const dataQueryParams = [...queryParams];
    dataQueryParams.push(pageSize);
    const limitPlaceholder = `$${dataQueryParams.length}`;
    dataQueryParams.push((page - 1) * pageSize);
    const offsetPlaceholder = `$${dataQueryParams.length}`;

    const rows = await this.dataSource.query<TransmissionASRetardSclRawRow[]>(
      `${baseQuery}
       SELECT
         code_sandre,
         nom,
         tranche_obligation,
         capacite_nominale,
         nb_fichiers_as_recus,
         date_dernier_fichier_recu,
         date_debut_periode,
         date_fin_periode,
         date_mesure_suivante_attendue,
         nb_jours_retard,
         exploitant_nom,
         exploitant_email,
         exploitant_date_envoi_mail
       FROM filtered_data
       ORDER BY ${sortColumn} ${sortOrder}, code_sandre ASC
       LIMIT ${limitPlaceholder}
       OFFSET ${offsetPlaceholder}`,
      dataQueryParams,
    );

    const formatDate = (value: Date | string | null) => {
      if (!value) return null;
      return typeof value === 'string' ? value.split('T')[0] : value.toISOString().split('T')[0];
    };

    return {
      data: rows.map((row) => ({
        systemeCollecteCode: row.code_sandre?.trim() ?? '',
        systemeCollecteNom: row.nom?.trim() ?? null,
        trancheObligationLibelle: row.tranche_obligation?.trim() ?? null,
        capaciteNominaleEH: row.capacite_nominale != null ? Number(row.capacite_nominale) : null,
        nbFichiersAsRecus: row.nb_fichiers_as_recus != null ? Number(row.nb_fichiers_as_recus) : null,
        dateDernierFichierRecu: formatDate(row.date_dernier_fichier_recu),
        dateDebutPeriode: formatDate(row.date_debut_periode),
        dateFinPeriode: formatDate(row.date_fin_periode),
        dateMesureSuivanteAttendue: formatDate(row.date_mesure_suivante_attendue),
        nbJoursRetard: row.nb_jours_retard != null ? Number(row.nb_jours_retard) : null,
        exploitantNom: row.exploitant_nom?.trim() ?? null,
        exploitantEmail: row.exploitant_email?.trim() ?? null,
        exploitantDateEnvoiMail: formatDate(row.exploitant_date_envoi_mail),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }
}
