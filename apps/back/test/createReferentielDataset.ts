import { DataSource } from 'typeorm';

export async function createReferentielSchemas(dataSource: DataSource): Promise<void> {
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS roseau`);
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS lanceleau`);
}

export async function createRoseauTables(dataSource: DataSource): Promise<void> {
  await dataSource.query(`DROP TABLE IF EXISTS roseau.steu CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.steu (
      steu_cdn INTEGER PRIMARY KEY,
      ag_cdn INTEGER,
      inst_ag_cdn INTEGER,
      tlref_35_cdn INTEGER,
      sti_cdn INTEGER,
      tlref_01_cdn INTEGER,
      tlref_11_cdn INTEGER,
      tlref_12_cdn INTEGER,
      zgc_cdn INTEGER,
      orm_cdn INTEGER,
      tlref_07_cdn INTEGER,
      inst_itv_cdn INTEGER,
      tlref_10_cdn INTEGER,
      tlref_09_cdn INTEGER,
      tlref_06_cdn INTEGER,
      ae_itv_cdn INTEGER,
      steu_sandre_cda VARCHAR,
      steu_nom_lb VARCHAR,
      steu_x_coord_no NUMERIC,
      steu_y_coord_no NUMERIC,
      steu_serv_en_mise_dt TIMESTAMP,
      steu_serv_hors_mise_dt TIMESTAMP,
      steu_cdb_rfa VARCHAR,
      steu_reg_rfa VARCHAR,
      steu_dep_rfa VARCHAR,
      steu_com_rfa VARCHAR,
      steu_lieu_dit_lb VARCHAR,
      steu_as_manuel_on BOOLEAN,
      steu_as_manuel_val_dt TIMESTAMP,
      steu_pe_exist_in VARCHAR,
      steu_com_txt TEXT,
      steu_ech_trav_desc_txt TEXT,
      steu_maj_dt TIMESTAMP,
      steu_eh_val_ent_max_chg_val NUMERIC,
      steu_eh_trait_nom_cap_val NUMERIC,
      steu_encours_an NUMERIC,
      steu_ae_certif_code_on BOOLEAN,
      steu_lon_coord_no NUMERIC,
      steu_lat_coord_no NUMERIC,
      tlref_65_cdn INTEGER,
      steu_desc_maj_dt TIMESTAMP,
      steu_suiv_maj_dt TIMESTAMP,
      steu_concat_com_txt TEXT,
      steu_old_sandre_cda VARCHAR,
      steu_abs_a2_on BOOLEAN,
      steu_devers_a2_on BOOLEAN,
      steu_proj_dt DATE,
      steu_service_an NUMERIC,
      steu_avis_motive_on BOOLEAN,
      steu_mt_prev_trx_val NUMERIC,
      steu_mt_prev_trx_maj_dt DATE,
      steu_suivi_trx_maj_dt DATE,
      steu_e_prtr_cda VARCHAR,
      steu_inspire_id VARCHAR,
      steu_recept_cdn INTEGER
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.tlref CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.tlref (
      tlref_cdn INTEGER PRIMARY KEY,
      trl_rfa VARCHAR,
      tlref_elt_cda VARCHAR
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.cxnadm CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.cxnadm (
      cxnadm_cdn INTEGER PRIMARY KEY,
      mo_steu_cdn INTEGER,
      steu_itv_cdn INTEGER,
      exp_steu_cdn INTEGER
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.pmo CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.pmo (
      pmo_cdn INTEGER PRIMARY KEY,
      steu_cdn INTEGER,
      pmo_no VARCHAR,
      tlref_16_cdn INTEGER,
      pmo_val_deb_dt DATE,
      pmo_val_fin_dt DATE
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.cpy CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.cpy (
      cpy_cdn INTEGER PRIMARY KEY,
      steu_cdn INTEGER,
      cpy_an NUMERIC,
      cpy_eh_trait_nom_cap_mt NUMERIC,
      cpy_ref_debit_mt NUMERIC
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.cxntech CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.cxntech (
      cxntech_cdn INTEGER PRIMARY KEY,
      aval_scl_cdn INTEGER,
      amont_zgc_cdn INTEGER,
      cxntech_retrait_dt TIMESTAMP
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.tltobl CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.tltobl (
      tltobl_rfa VARCHAR PRIMARY KEY,
      tltobl_lb VARCHAR
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.aga CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.aga (
      aga_cdn INTEGER PRIMARY KEY,
      zgc_cdn INTEGER,
      aga_sandre_cda VARCHAR,
      tltobl_rfa VARCHAR
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.scl CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.scl (
      scl_cdn INTEGER PRIMARY KEY,
      tlref_02_cdn INTEGER,
      zgc_cdn INTEGER,
      tlref_05_cdn INTEGER,
      steu_cdn INTEGER,
      tlref_01_cdn INTEGER,
      scl_sandre_cda VARCHAR,
      scl_lb VARCHAR,
      scl_com_txt TEXT,
      scl_trx_desc_txt TEXT,
      scl_autosurv_val_in VARCHAR,
      scl_direct_rejet_exist_in VARCHAR,
      scl_as_manuel_on BOOLEAN,
      scl_as_manuel_val_dt TIMESTAMP,
      tlref_66_cdn INTEGER,
      scl_old_sandre_cda VARCHAR,
      scl_encours_an NUMERIC,
      scl_ts_trx_desc_txt TEXT,
      tlref_ts_66_cdn INTEGER,
      scl_mt_prev_trx_ts_val NUMERIC,
      scl_mt_prev_trx_ts_maj_dt DATE,
      scl_mt_prev_trx_tp_val NUMERIC,
      scl_mt_prev_trx_tp_maj_dt DATE,
      scl_suivi_trx_ts_maj_dt DATE,
      scl_suivi_trx_tp_maj_dt DATE
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.resa CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.resa (
      resa_cdn INTEGER PRIMARY KEY,
      steu_cdn INTEGER,
      resa_an NUMERIC,
      par_rfa VARCHAR,
      resa_cma_val NUMERIC
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS roseau.stchan CASCADE`);
  await dataSource.query(`
    CREATE TABLE roseau.stchan (
      steu_cdn INTEGER NOT NULL,
      stchan_an NUMERIC NOT NULL,
      stchan_r_eh_max_chg_val NUMERIC,
      stchan_pc95_val NUMERIC,
      stchan_r_1an_jr_deb_95_perc_val NUMERIC,
      stchan_r_2ans_jr_deb_95_perc_val NUMERIC,
      stchan_r_3ans_jr_deb_95_perc_val NUMERIC,
      stchan_r_4ans_jr_deb_95_perc_val NUMERIC,
      stchan_r_5ans_jr_deb_95_perc_val NUMERIC,
      PRIMARY KEY (steu_cdn, stchan_an)
    )
  `);
}

export async function createLanceleauTables(dataSource: DataSource): Promise<void> {
  await dataSource.query(`DROP TABLE IF EXISTS lanceleau.itv CASCADE`);
  await dataSource.query(`
    CREATE TABLE lanceleau.itv (
      itv_cdn INTEGER PRIMARY KEY,
      peti_cdn INTEGER,
      dir_itv_cdn INTEGER,
      actpe_cdn INTEGER,
      titv_rfa VARCHAR,
      adr_cdn INTEGER,
      itv_rfa VARCHAR,
      itv_origine_lb VARCHAR,
      itv_nom_lb VARCHAR,
      itv_statut_lb VARCHAR,
      itv_cre_dt TIMESTAMP,
      itv_maj_dt TIMESTAMP,
      itv_mnemo_lb VARCHAR,
      itv_com_txt TEXT,
      itv_nom_inter_lb VARCHAR,
      itv_siret_rfa VARCHAR,
      itv_orig_rfa VARCHAR,
      itv_val_deb_dt TIMESTAMP,
      itv_val_fin_dt TIMESTAMP,
      itv_pacage_cda VARCHAR,
      itv_etranger_on BOOLEAN,
      itv_attente_sandre_on BOOLEAN,
      itv_histo_pr_cdn NUMERIC,
      itv_crea_cdn NUMERIC,
      naf_rfa VARCHAR,
      w_bdnu_uf_cdn INTEGER,
      itv_id INTEGER,
      orga_cdn INTEGER,
      w_bdnu_uf_2014_cdn INTEGER,
      ougc_cdn INTEGER,
      itv_confiance_on BOOLEAN,
      itv_nom_phonetise_lb VARCHAR,
      itv_siege_on BOOLEAN,
      itv_diffusible_on BOOLEAN,
      itv_serv_corres_rfa VARCHAR
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS lanceleau.t_orion_credentials CASCADE`);
  await dataSource.query(`
    CREATE TABLE lanceleau.t_orion_credentials (
      pr_cdn INTEGER PRIMARY KEY,
      mail VARCHAR,
      login_lb VARCHAR
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS lanceleau.ag CASCADE`);
  await dataSource.query(`
    CREATE TABLE lanceleau.ag (
      pr_cdn INTEGER PRIMARY KEY,
      itv_cdn INTEGER
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS lanceleau.sup CASCADE`);
  await dataSource.query(`
    CREATE TABLE lanceleau.sup (
      sup_rfa VARCHAR PRIMARY KEY
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS lanceleau.fan CASCADE`);
  await dataSource.query(`
    CREATE TABLE lanceleau.fan (
      fan_rfa VARCHAR PRIMARY KEY
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS lanceleau.par CASCADE`);
  await dataSource.query(`
    CREATE TABLE lanceleau.par (
      par_rfa VARCHAR PRIMARY KEY
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS lanceleau.urf CASCADE`);
  await dataSource.query(`
    CREATE TABLE lanceleau.urf (
      urf_rfa VARCHAR PRIMARY KEY
    )
  `);

  await dataSource.query(`DROP TABLE IF EXISTS lanceleau.t_orion_role_for_principal CASCADE`);
  await dataSource.query(`
    CREATE TABLE lanceleau.t_orion_role_for_principal (
      pr_cdn INTEGER,
      role_cdn INTEGER,
      PRIMARY KEY (pr_cdn, role_cdn)
    )
  `);
}

export async function createVerseauTables(dataSource: DataSource): Promise<void> {
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS verseau`);

  await dataSource.query(`DROP TABLE IF EXISTS verseau.v_steu_scl_itv CASCADE`);
  await dataSource.query(`
    CREATE TABLE verseau.v_steu_scl_itv (
      steu_cda VARCHAR,
      scl_cda VARCHAR,
      mo_itv_rfa VARCHAR,
      sat_itv_rfa VARCHAR,
      ae_itv_rfa VARCHAR
    )
  `);
}

export async function createReferentielDataset(dataSource: DataSource): Promise<void> {
  await createReferentielSchemas(dataSource);
  await createRoseauTables(dataSource);
  await createLanceleauTables(dataSource);
  await createVerseauTables(dataSource);
}

export async function clearReferentielData(dataSource: DataSource): Promise<void> {
  await dataSource.query(`DELETE FROM roseau.stchan`);
  await dataSource.query(`DELETE FROM roseau.resa`);
  await dataSource.query(`DELETE FROM roseau.cpy`);
  await dataSource.query(`DELETE FROM roseau.cxntech`);
  await dataSource.query(`DELETE FROM roseau.cxnadm`);
  await dataSource.query(`DELETE FROM roseau.pmo`);
  await dataSource.query(`DELETE FROM roseau.tlref`);
  await dataSource.query(`DELETE FROM roseau.aga`);
  await dataSource.query(`DELETE FROM roseau.tltobl`);
  await dataSource.query(`DELETE FROM roseau.scl`);
  await dataSource.query(`DELETE FROM roseau.steu`);
  await dataSource.query(`DELETE FROM lanceleau.sup`);
  await dataSource.query(`DELETE FROM lanceleau.fan`);
  await dataSource.query(`DELETE FROM lanceleau.par`);
  await dataSource.query(`DELETE FROM lanceleau.urf`);
  await dataSource.query(`DELETE FROM lanceleau.itv`);
}

// ============= Seed Data Functions =============

export async function seedSteu(
  dataSource: DataSource,
  steuCdn: number,
  steuSandreCda: string,
  options?: { steuEncoursAn?: number | null; zgcCdn?: number | null },
): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.steu (steu_cdn, steu_sandre_cda, steu_encours_an, zgc_cdn)
    VALUES ($1, $2, $3, $4)
  `,
    [steuCdn, steuSandreCda, options?.steuEncoursAn ?? null, options?.zgcCdn ?? null],
  );
}

export async function seedItv(dataSource: DataSource, itvCdn: number, itvRfa: string): Promise<void> {
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
  cxnadmCdn: number,
  moSteuCdn: number,
  steuItvCdn: number,
  expSteuCdn?: number,
): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.cxnadm (cxnadm_cdn, mo_steu_cdn, steu_itv_cdn, exp_steu_cdn)
    VALUES ($1, $2, $3, $4)
  `,
    [cxnadmCdn, moSteuCdn, steuItvCdn, expSteuCdn ?? null],
  );
}

export async function seedPmo(
  dataSource: DataSource,
  pmoCdn: number,
  steuCdn: number,
  pmoNo: string,
  tlref16Cdn?: number,
): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.pmo (pmo_cdn, steu_cdn, pmo_no, tlref_16_cdn)
    VALUES ($1, $2, $3, $4)
  `,
    [pmoCdn, steuCdn, pmoNo, tlref16Cdn ?? null],
  );
}

export async function seedTlref(
  dataSource: DataSource,
  tlrefCdn: number,
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
  resaCdn: number,
  steuCdn: number,
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

export async function seedCpy(
  dataSource: DataSource,
  cpyCdn: number,
  steuCdn: number,
  cpyAn: number,
  cpyEhTraitNomCapMt?: number | null,
  cpyRefDebitMt?: number | null,
): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.cpy (cpy_cdn, steu_cdn, cpy_an, cpy_eh_trait_nom_cap_mt, cpy_ref_debit_mt)
    VALUES ($1, $2, $3, $4, $5)
  `,
    [cpyCdn, steuCdn, cpyAn, cpyEhTraitNomCapMt ?? null, cpyRefDebitMt ?? null],
  );
}

export async function seedStchan(
  dataSource: DataSource,
  steuCdn: number,
  stchanAn: number,
  stchanPc95Val?: number | null,
  stchanREhMaxChgVal?: number | null,
): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.stchan (steu_cdn, stchan_an, stchan_pc95_val, stchan_r_eh_max_chg_val)
    VALUES ($1, $2, $3, $4)
  `,
    [steuCdn, stchanAn, stchanPc95Val ?? null, stchanREhMaxChgVal ?? null],
  );
}

// ============= Lanceleau Seed Functions =============

export async function seedOrionCredentials(
  dataSource: DataSource,
  prCdn: number,
  mail: string,
  loginLb: string,
): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO lanceleau.t_orion_credentials (pr_cdn, mail, login_lb)
    VALUES ($1, $2, $3)
  `,
    [prCdn, mail, loginLb],
  );
}

export async function seedAg(dataSource: DataSource, prCdn: number, itvCdn: number): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO lanceleau.ag (pr_cdn, itv_cdn)
    VALUES ($1, $2)
  `,
    [prCdn, itvCdn],
  );
}

// ============= Roseau Additional Seed Functions =============

export async function seedScl(dataSource: DataSource, sclCdn: number, sclSandreCda: string): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.scl (scl_cdn, scl_sandre_cda)
    VALUES ($1, $2)
  `,
    [sclCdn, sclSandreCda],
  );
}

export async function seedAga(
  dataSource: DataSource,
  agaCdn: number,
  zgcCdn: number,
  agaSandreCda: string,
  tltoblRfa?: string | null,
): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.aga (aga_cdn, zgc_cdn, aga_sandre_cda, tltobl_rfa)
    VALUES ($1, $2, $3, $4)
  `,
    [agaCdn, zgcCdn, agaSandreCda, tltoblRfa ?? null],
  );
}

export async function seedTltobl(dataSource: DataSource, tltoblRfa: string, tltoblLb: string): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.tltobl (tltobl_rfa, tltobl_lb)
    VALUES ($1, $2)
  `,
    [tltoblRfa, tltoblLb],
  );
}

export async function seedCxntech(
  dataSource: DataSource,
  cxntechCdn: number,
  avalSclCdn: number,
  amontZgcCdn: number,
  cxntechRetraitDt: Date | null = null,
): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO roseau.cxntech (cxntech_cdn, aval_scl_cdn, amont_zgc_cdn, cxntech_retrait_dt)
    VALUES ($1, $2, $3, $4)
  `,
    [cxntechCdn, avalSclCdn, amontZgcCdn, cxntechRetraitDt],
  );
}

// ============= Lanceleau Additional Seed Functions =============

export async function seedSup(dataSource: DataSource, supRfa: string): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO lanceleau.sup (sup_rfa)
    VALUES ($1)
  `,
    [supRfa],
  );
}

export async function seedFan(dataSource: DataSource, fanRfa: string): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO lanceleau.fan (fan_rfa)
    VALUES ($1)
  `,
    [fanRfa],
  );
}

export async function seedPar(dataSource: DataSource, parRfa: string): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO lanceleau.par (par_rfa)
    VALUES ($1)
  `,
    [parRfa],
  );
}

export async function seedUrf(dataSource: DataSource, urfRfa: string): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO lanceleau.urf (urf_rfa)
    VALUES ($1)
  `,
    [urfRfa],
  );
}

export async function seedOrionRoleForPrincipal(dataSource: DataSource, prCdn: number, roleCdn: number): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO lanceleau.t_orion_role_for_principal (pr_cdn, role_cdn)
    VALUES ($1, $2)
  `,
    [prCdn, roleCdn],
  );
}

export async function clearLanceleauData(dataSource: DataSource): Promise<void> {
  await dataSource.query(`DELETE FROM lanceleau.ag`);
  await dataSource.query(`DELETE FROM lanceleau.t_orion_credentials`);
  await dataSource.query(`DELETE FROM lanceleau.itv`);
  await dataSource.query(`DELETE FROM lanceleau.t_orion_role_for_principal`);
}

export async function seedUser(dataSource: DataSource, id: string, sub: string, email: string): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO "user" (id, sub, email, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), NOW())
  `,
    [id, sub, email],
  );
}

export async function seedDepot(dataSource: DataSource, id: string, itvCdn: number, status: string): Promise<void> {
  await dataSource.query(
    `
    INSERT INTO depot (id, nom_original_fichier, taille_fichier, type, status, itv_cdn, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
  `,
    [id, 'test.xml', 1024, 'application/xml', status, itvCdn],
  );
}

export async function clearUserData(dataSource: DataSource, sub: string): Promise<void> {
  await dataSource.query(`DELETE FROM "user" WHERE sub = $1`, [sub]);
}

export async function clearDepotData(dataSource: DataSource, id: string): Promise<void> {
  await dataSource.query(`DELETE FROM depot WHERE id = $1`, [id]);
}
