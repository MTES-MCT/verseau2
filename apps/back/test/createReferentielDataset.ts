import { DataSource } from 'typeorm';

export async function createReferentielSchemas(dataSource: DataSource): Promise<void> {
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS roseau`);
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS lanceleau`);
}

export async function createRoseauTables(dataSource: DataSource): Promise<void> {
  await dataSource.query(`DROP TABLE IF EXISTS roseau.steu CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.steu (
      steu_cdn VARCHAR PRIMARY KEY,
      ag_cdn VARCHAR,
      inst_ag_cdn VARCHAR,
      tlref_35_cdn VARCHAR,
      sti_cdn VARCHAR,
      tlref_01_cdn VARCHAR,
      tlref_11_cdn VARCHAR,
      tlref_12_cdn VARCHAR,
      zgc_cdn VARCHAR,
      orm_cdn VARCHAR,
      tlref_07_cdn VARCHAR,
      inst_itv_cdn VARCHAR,
      tlref_10_cdn VARCHAR,
      tlref_09_cdn VARCHAR,
      tlref_06_cdn VARCHAR,
      ae_itv_cdn VARCHAR,
      steu_sandre_cda VARCHAR,
      steu_nom_lb VARCHAR,
      steu_x_coord_no VARCHAR,
      steu_y_coord_no VARCHAR,
      steu_serv_en_mise_dt VARCHAR,
      steu_serv_hors_mise_dt VARCHAR,
      steu_cdb_rfa VARCHAR,
      steu_reg_rfa VARCHAR,
      steu_dep_rfa VARCHAR,
      steu_com_rfa VARCHAR,
      steu_lieu_dit_lb VARCHAR,
      steu_as_manuel_on VARCHAR,
      steu_as_manuel_val_dt VARCHAR,
      steu_pe_exist_in VARCHAR,
      steu_com_txt VARCHAR,
      steu_ech_trav_desc_txt VARCHAR,
      steu_maj_dt VARCHAR,
      steu_eh_val_ent_max_chg_val VARCHAR,
      steu_eh_trait_nom_cap_val VARCHAR,
      steu_encours_an VARCHAR,
      steu_ae_certif_code_on VARCHAR,
      steu_lon_coord_no VARCHAR,
      steu_lat_coord_no VARCHAR,
      tlref_65_cdn VARCHAR,
      steu_desc_maj_dt VARCHAR,
      steu_suiv_maj_dt VARCHAR,
      steu_concat_com_txt VARCHAR,
      steu_old_sandre_cda VARCHAR,
      steu_abs_a2_on VARCHAR,
      steu_devers_a2_on VARCHAR,
      steu_proj_dt VARCHAR,
      steu_service_an VARCHAR,
      steu_avis_motive_on VARCHAR,
      steu_mt_prev_trx_val VARCHAR,
      steu_mt_prev_trx_maj_dt VARCHAR,
      steu_suivi_trx_maj_dt VARCHAR,
      steu_e_prtr_cda VARCHAR,
      steu_inspire_id VARCHAR,
      steu_recept_cdn VARCHAR
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.tlref CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.tlref (
      tlref_cdn VARCHAR PRIMARY KEY,
      trl_rfa VARCHAR,
      tlref_elt_cda VARCHAR
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.cxnadm CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.cxnadm (
      cxnadm_cdn VARCHAR PRIMARY KEY,
      mo_steu_cdn VARCHAR,
      steu_itv_cdn VARCHAR,
      exp_steu_cdn VARCHAR
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.pmo CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.pmo (
      pmo_cdn VARCHAR PRIMARY KEY,
      steu_cdn VARCHAR,
      pmo_no INTEGER,
      tlref_16_cdn VARCHAR,
      pmo_val_deb_dt DATE,
      pmo_val_fin_dt DATE
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.cpy CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.cpy (
      cpy_cdn VARCHAR PRIMARY KEY,
      steu_cdn VARCHAR,
      cpy_an INTEGER,
      cpy_eh_trait_nom_cap_mt NUMERIC
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.cxntech CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.cxntech (
      cxntech_cdn VARCHAR PRIMARY KEY,
      aval_scl_cdn VARCHAR,
      amont_zgc_cdn VARCHAR,
      cxntech_retrait_dt VARCHAR
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.aga CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.aga (
      aga_cdn VARCHAR PRIMARY KEY,
      zgc_cdn VARCHAR,
      aga_sandre_cda VARCHAR
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.scl CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.scl (
      scl_cdn VARCHAR PRIMARY KEY,
      scl_sandre_cda VARCHAR
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.resa CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.resa (
      resa_cdn VARCHAR PRIMARY KEY,
      steu_cdn VARCHAR,
      resa_an INTEGER,
      par_rfa VARCHAR,
      resa_cma_val NUMERIC
    )
  `);
}

export async function createLanceleauTables(dataSource: DataSource): Promise<void> {
  await dataSource.query(`DROP TABLE IF EXISTS lanceleau.itv CASCADE`);
  await dataSource.query(`
    CREATE TABLE lanceleau.itv (
      itv_cdn VARCHAR PRIMARY KEY,
      peti_cdn VARCHAR,
      dir_itv_cdn VARCHAR,
      actpe_cdn VARCHAR,
      titv_rfa VARCHAR,
      adr_cdn VARCHAR,
      itv_rfa VARCHAR,
      itv_origine_lb VARCHAR,
      itv_nom_lb VARCHAR,
      itv_statut_lb VARCHAR,
      itv_cre_dt VARCHAR,
      itv_maj_dt VARCHAR,
      itv_mnemo_lb VARCHAR,
      itv_com_txt VARCHAR,
      itv_nom_inter_lb VARCHAR,
      itv_siret_rfa VARCHAR,
      itv_orig_rfa VARCHAR,
      itv_val_deb_dt VARCHAR,
      itv_val_fin_dt VARCHAR,
      itv_pacage_cda VARCHAR,
      itv_etranger_on VARCHAR,
      itv_attente_sandre_on VARCHAR,
      itv_histo_pr_cdn VARCHAR,
      itv_crea_cdn VARCHAR,
      naf_rfa VARCHAR,
      w_bdnu_uf_cdn VARCHAR,
      itv_id VARCHAR,
      orga_cdn VARCHAR,
      w_bdnu_uf_2014_cdn VARCHAR,
      ougc_cdn VARCHAR,
      itv_confiance_on VARCHAR,
      itv_nom_phonetise_lb VARCHAR,
      itv_siege_on VARCHAR,
      itv_diffusible_on VARCHAR,
      itv_serv_corres_rfa VARCHAR
    )
  `);
}

export async function createReferentielDataset(dataSource: DataSource): Promise<void> {
  await createReferentielSchemas(dataSource);
  await createRoseauTables(dataSource);
  await createLanceleauTables(dataSource);
}

export async function clearReferentielData(dataSource: DataSource): Promise<void> {
  await dataSource.query(`DELETE FROM roseau.steu`);
  await dataSource.query(`DELETE FROM roseau.cxnadm`);
  await dataSource.query(`DELETE FROM roseau.pmo`);
  await dataSource.query(`DELETE FROM roseau.tlref`);
  await dataSource.query(`DELETE FROM lanceleau.itv`);
}

// ============= Seed Data Functions =============

export async function seedSteu(dataSource: DataSource, steuCdn: string, steuSandreCda: string): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda)
    VALUES ($1, $2)
  `,
    [steuCdn, steuSandreCda],
  );
}

export async function seedItv(dataSource: DataSource, itvCdn: string, itvRfa: string): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO lanceleau.itv (itv_cdn, itv_rfa)
    VALUES ($1, $2)
  `,
    [itvCdn, itvRfa],
  );
}

export async function seedCxnadm(
  dataSource: DataSource,
  cxnadmCdn: string,
  moSteuCdn: string,
  steuItvCdn: string,
  expSteuCdn?: string,
): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.cxnadm (cxnadm_cdn, mo_steu_cdn, steu_itv_cdn, exp_steu_cdn)
    VALUES ($1, $2, $3, $4)
  `,
    [cxnadmCdn, moSteuCdn, steuItvCdn, expSteuCdn ?? null],
  );
}

export async function seedPmo(dataSource: DataSource, pmoCdn: string, steuCdn: string, pmoNo: number): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.pmo (pmo_cdn, steu_cdn, pmo_no)
    VALUES ($1, $2, $3)
  `,
    [pmoCdn, steuCdn, pmoNo],
  );
}

export async function seedTlref(
  dataSource: DataSource,
  tlrefCdn: string,
  trlRfa: string,
  tlrefEltCda: string,
): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.tlref (tlref_cdn, trl_rfa, tlref_elt_cda)
    VALUES ($1, $2, $3)
  `,
    [tlrefCdn, trlRfa, tlrefEltCda],
  );
}

export async function seedResa(
  dataSource: DataSource,
  resaCdn: string,
  steuCdn: string,
  resaAn: number,
  parRfa: string,
  resaCmaVal: number,
): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.resa (resa_cdn, steu_cdn, resa_an, par_rfa, resa_cma_val)
    VALUES ($1, $2, $3, $4, $5)
  `,
    [resaCdn, steuCdn, resaAn, parRfa, resaCmaVal],
  );
}
