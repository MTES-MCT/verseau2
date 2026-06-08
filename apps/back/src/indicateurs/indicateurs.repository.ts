import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IndicateurSteuDto } from '@lib/dossier';
import { IndicateursGateway } from './indicateurs.gateway';
import { getYearMinus } from '@lib/shared';

interface IndicateurSteuRecord {
  bassin: string;
  region: string;
  departement: string;
  code_sandre_agglo: string;
  nom_agglo: string;
  nature: string;
  tranche_obligation: string;
  etat_agglo: string;
  taille_agglo_eh_an_n: number;
  somme_charges_max_entrantes_eh: number;
  code_sandre_steu: string;
  nom_steu: string;
  capacite_nominale_eh_an_n: number;
  debit_reference: number;
  charge_entrante_eh_an_n: number;
  pc95_retenu: number | null;
  nb_annees_max_pc95: number;
  annee: number;
  // Conformité SCL (sclconf) — temps de pluie
  code_sandre_scl: string | null;
  date_validation_conformite: string | null;
  volume_deverse_5ans_pc: number | null;
  flux_deverse_5ans_pc: number | null;
  jours_deversement_5ans_moy: number | null;
}
@Injectable()
export class IndicateursRepository implements IndicateursGateway {
  constructor(private readonly dataSource: DataSource) {}

  async findIndicateursSteu(
    steuCodes: string[],
    page: number,
    pageSize: number,
  ): Promise<{ data: IndicateurSteuDto[]; total: number }> {
    if (steuCodes.length === 0) {
      return { data: [], total: 0 };
    }

    const placeholders = steuCodes.map((_, i) => `$${i + 1}`).join(',');
    const limitParam = steuCodes.length + 1;
    const offsetParam = steuCodes.length + 2;
    const offset = (page - 1) * pageSize;

    const previousYear = getYearMinus(1);
    const baseQuery = `
SELECT
    TRIM(cdb.cdb_nom_lb)                       AS bassin,
    reg.reg_lb                                 AS region,
    aga.aga_dep_rfa                            AS departement,
    RTRIM(aga.aga_sandre_cda)                  AS code_sandre_agglo,
    aga.aga_nom_lb                             AS nom_agglo,
    t64.tlref_mnemo_lb                         AS nature,
    tltobl.tltobl_lb                           AS tranche_obligation,
    t03.tlref_mnemo_lb                         AS etat_agglo,
    agat.agat_cbpo_val                         AS taille_agglo_eh_an_n,
    agat.agat_ent_calc_max_chg_som_val         AS somme_charges_max_entrantes_eh,
    RTRIM(steu.steu_sandre_cda)                AS code_sandre_steu,
    steu.steu_nom_lb                           AS nom_steu,
    cpy.cpy_eh_trait_nom_cap_mt                AS capacite_nominale_eh_an_n,
    GREATEST(
        COALESCE(
            CASE
                WHEN stchan.stchan_r_5ans_jr_deb_95_perc_val IS NOT NULL THEN ROUND(stchan.stchan_r_5ans_jr_deb_95_perc_val, 2)
                WHEN stchan.stchan_r_4ans_jr_deb_95_perc_val IS NOT NULL THEN ROUND(stchan.stchan_r_4ans_jr_deb_95_perc_val, 2)
                WHEN stchan.stchan_r_3ans_jr_deb_95_perc_val IS NOT NULL THEN ROUND(stchan.stchan_r_3ans_jr_deb_95_perc_val, 2)
                WHEN stchan.stchan_r_2ans_jr_deb_95_perc_val IS NOT NULL THEN ROUND(stchan.stchan_r_2ans_jr_deb_95_perc_val, 2)
                WHEN stchan.stchan_r_1an_jr_deb_95_perc_val IS NOT NULL THEN ROUND(stchan.stchan_r_1an_jr_deb_95_perc_val, 2)
                ELSE NULL
            END,
            0
        ),
        cpy.cpy_ref_debit_mt
    )                                            AS debit_reference,
    stchan.stchan_r_eh_max_chg_val             AS charge_entrante_eh_an_n,
    CASE
        WHEN stchan.stchan_r_5ans_jr_deb_95_perc_val IS NOT NULL THEN ROUND(stchan.stchan_r_5ans_jr_deb_95_perc_val, 2)
        WHEN stchan.stchan_r_4ans_jr_deb_95_perc_val IS NOT NULL THEN ROUND(stchan.stchan_r_4ans_jr_deb_95_perc_val, 2)
        WHEN stchan.stchan_r_3ans_jr_deb_95_perc_val IS NOT NULL THEN ROUND(stchan.stchan_r_3ans_jr_deb_95_perc_val, 2)
        WHEN stchan.stchan_r_2ans_jr_deb_95_perc_val IS NOT NULL THEN ROUND(stchan.stchan_r_2ans_jr_deb_95_perc_val, 2)
        WHEN stchan.stchan_r_1an_jr_deb_95_perc_val IS NOT NULL THEN ROUND(stchan.stchan_r_1an_jr_deb_95_perc_val, 2)
        ELSE NULL
    END AS pc95_retenu,
    CASE
        WHEN stchan.stchan_r_5ans_jr_deb_95_perc_val IS NOT NULL THEN 5
        WHEN stchan.stchan_r_4ans_jr_deb_95_perc_val IS NOT NULL THEN 4
        WHEN stchan.stchan_r_3ans_jr_deb_95_perc_val IS NOT NULL THEN 3
        WHEN stchan.stchan_r_2ans_jr_deb_95_perc_val IS NOT NULL THEN 2
        WHEN stchan.stchan_r_1an_jr_deb_95_perc_val IS NOT NULL THEN 1
        ELSE 0
    END AS nb_annees_max_pc95,
    RTRIM(scl.scl_sandre_cda)                         AS code_sandre_scl,
    sclconf.sclconf_eru_eval_tp_val_dt::text          AS date_validation_conformite,
    sclconf.sclconf_eru_eval_vol_5ans_pc              AS volume_deverse_5ans_pc,
    sclconf.sclconf_eru_eval_flux_5ans_pc             AS flux_deverse_5ans_pc,
    sclconf.sclconf_eru_eval_j_dv_5ans_nb             AS jours_deversement_5ans_moy
FROM roseau.steu steu
JOIN roseau.tlref t09 ON t09.tlref_cdn = steu.tlref_09_cdn
JOIN roseau.tlref t10 ON t10.tlref_cdn = steu.tlref_10_cdn
JOIN roseau.cxntech cxn
    ON cxn.aval_steu_cdn = steu.steu_cdn
   AND date_part('year', cxn.cxntech_creation_dt) <= ${previousYear}
   AND (cxn.cxntech_retrait_dt IS NULL OR date_part('year', cxn.cxntech_retrait_dt) >= ${previousYear})
JOIN roseau.aga aga ON aga.zgc_cdn = cxn.amont_zgc_cdn
JOIN roseau.agac agac ON agac.aga_cdn = aga.aga_cdn AND agac.agac_conf_an = ${previousYear}
JOIN roseau.agat agat ON agat.aga_cdn = aga.aga_cdn AND agat.agat_taille_an = agac.agac_conf_an
JOIN roseau.cpy cpy ON cpy.steu_cdn = steu.steu_cdn AND cpy.cpy_an = agac.agac_conf_an
JOIN roseau.stchan stchan ON stchan.steu_cdn = steu.steu_cdn AND stchan.stchan_an = agac.agac_conf_an
JOIN lanceleau.cdb cdb ON cdb.cdb_rfa = aga.aga_cdb_rfa
JOIN lanceleau.reg reg ON reg.reg_rfa = aga.aga_reg_rfa
JOIN roseau.tlref t64 ON t64.tlref_cdn = aga.tlref_64_cdn
JOIN roseau.tlref t03 ON t03.tlref_cdn = aga.tlref_03_cdn
JOIN roseau.tltobl tltobl ON tltobl.tltobl_rfa = aga.tltobl_rfa
LEFT JOIN roseau.scl scl ON scl.steu_cdn = steu.steu_cdn
LEFT JOIN roseau.sclconf sclconf ON sclconf.scl_cdn = scl.scl_cdn AND sclconf.sclconf_an = ${previousYear}
WHERE RTRIM(steu.steu_sandre_cda) IN (${placeholders})
    `;

    // TODO : faire une seule query pour données et count
    const countQuery = `SELECT COUNT(*)::int AS total FROM (${baseQuery}) indicateurs`;
    const dataQuery = `${baseQuery} ORDER BY nom_steu ASC NULLS LAST, code_sandre_steu ASC LIMIT $${limitParam} OFFSET $${offsetParam}`;

    const [countResult, results] = await Promise.all([
      this.dataSource.query<{ total: number }[]>(countQuery, steuCodes),
      this.dataSource.query<IndicateurSteuRecord[]>(dataQuery, [...steuCodes, pageSize, offset]),
    ]);

    return {
      total: countResult[0]?.total ?? 0,
      data: results.map((r: IndicateurSteuRecord) => ({
        bassin: r.bassin,
        region: r.region,
        departement: r.departement,
        codeSandreAgglo: r.code_sandre_agglo,
        nomAgglo: r.nom_agglo,
        nature: r.nature,
        trancheObligation: r.tranche_obligation,
        etatAgglo: r.etat_agglo,
        tailleAggloEhAnN: Number(r.taille_agglo_eh_an_n),
        sommeChargesMaxEntrantesEh: Number(r.somme_charges_max_entrantes_eh),
        codeSandreSteu: r.code_sandre_steu,
        nomSteu: r.nom_steu,
        capaciteNominaleEhAnN: Number(r.capacite_nominale_eh_an_n),
        debitReference: Number(r.debit_reference),
        chargeEntranteEhAnN: Number(r.charge_entrante_eh_an_n),
        pc95Retenu: r.pc95_retenu !== null ? Number(r.pc95_retenu) : null,
        nbAnneesMaxPc95: Number(r.nb_annees_max_pc95),
        annee: previousYear,
        codeSandreScl: r.code_sandre_scl ?? null,
        dateValidationConformite: r.date_validation_conformite ?? null,
        volumeDeverse5ansPc:
          r.volume_deverse_5ans_pc !== null && r.volume_deverse_5ans_pc !== undefined
            ? Number(r.volume_deverse_5ans_pc)
            : null,
        fluxDeverse5ansPc:
          r.flux_deverse_5ans_pc !== null && r.flux_deverse_5ans_pc !== undefined
            ? Number(r.flux_deverse_5ans_pc)
            : null,
        joursDeversement5ansMoy:
          r.jours_deversement_5ans_moy !== null && r.jours_deversement_5ans_moy !== undefined
            ? Number(r.jours_deversement_5ans_moy)
            : null,
      })),
    };
  }
}
