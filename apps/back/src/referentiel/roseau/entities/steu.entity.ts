import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('steu', { schema: 'custom_ingestion_roseau', synchronize: false })
export class SteuEntity {
  @PrimaryColumn({ name: 'steu_cdn' })
  steuCdn: string;

  @Column({ name: 'ag_cdn', nullable: true })
  agCdn: string;

  @Column({ name: 'inst_ag_cdn', nullable: true })
  instAgCdn: string;

  @Column({ name: 'tlref_35_cdn', nullable: true })
  tlref35Cdn: string;

  @Column({ name: 'sti_cdn', nullable: true })
  stiCdn: string;

  @Column({ name: 'tlref_01_cdn', nullable: true })
  tlref01Cdn: string;

  @Column({ name: 'tlref_11_cdn', nullable: true })
  tlref11Cdn: string;

  @Column({ name: 'tlref_12_cdn', nullable: true })
  tlref12Cdn: string;

  @Column({ name: 'zgc_cdn', nullable: true })
  zgcCdn: string;

  @Column({ name: 'orm_cdn', nullable: true })
  ormCdn: string;

  @Column({ name: 'tlref_07_cdn', nullable: true })
  tlref07Cdn: string;

  @Column({ name: 'inst_itv_cdn', nullable: true })
  instItvCdn: string;

  @Column({ name: 'tlref_10_cdn', nullable: true })
  tlref10Cdn: string;

  @Column({ name: 'tlref_09_cdn', nullable: true })
  tlref09Cdn: string;

  @Column({ name: 'tlref_06_cdn', nullable: true })
  tlref06Cdn: string;

  @Column({ name: 'ae_itv_cdn', nullable: true })
  aeItvCdn: string;

  @Column({ name: 'steu_sandre_cda', nullable: true })
  steuSandreCda: string;

  @Column({ name: 'steu_nom_lb', nullable: true })
  steuNomLb: string;

  @Column({ name: 'steu_x_coord_no', nullable: true })
  steuXCoordNo: string;

  @Column({ name: 'steu_y_coord_no', nullable: true })
  steuYCoordNo: string;

  @Column({ name: 'steu_serv_en_mise_dt', nullable: true })
  steuServEnMiseDt: string;

  @Column({ name: 'steu_serv_hors_mise_dt', nullable: true })
  steuServHorsMiseDt: string;

  @Column({ name: 'steu_cdb_rfa', nullable: true })
  steuCdbRfa: string;

  @Column({ name: 'steu_reg_rfa', nullable: true })
  steuRegRfa: string;

  @Column({ name: 'steu_dep_rfa', nullable: true })
  steuDepRfa: string;

  @Column({ name: 'steu_com_rfa', nullable: true })
  steuComRfa: string;

  @Column({ name: 'steu_lieu_dit_lb', nullable: true })
  steuLieuDitLb: string;

  @Column({ name: 'steu_as_manuel_on', nullable: true })
  steuAsManuelOn: string;

  @Column({ name: 'steu_as_manuel_val_dt', nullable: true })
  steuAsManuelValDt: string;

  @Column({ name: 'steu_pe_exist_in', nullable: true })
  steuPeExistIn: string;

  @Column({ name: 'steu_com_txt', nullable: true })
  steuComTxt: string;

  @Column({ name: 'steu_ech_trav_desc_txt', nullable: true })
  steuEchTravDescTxt: string;

  @Column({ name: 'steu_maj_dt', nullable: true })
  steuMajDt: string;

  @Column({ name: 'steu_eh_val_ent_max_chg_val', nullable: true })
  steuEhValEntMaxChgVal: string;

  @Column({ name: 'steu_eh_trait_nom_cap_val', nullable: true })
  steuEhTraitNomCapVal: string;

  @Column({ name: 'steu_encours_an', nullable: true })
  steuEncoursAn: string;

  @Column({ name: 'steu_ae_certif_code_on', nullable: true })
  steuAeCertifCodeOn: string;

  @Column({ name: 'steu_lon_coord_no', nullable: true })
  steuLonCoordNo: string;

  @Column({ name: 'steu_lat_coord_no', nullable: true })
  steuLatCoordNo: string;

  @Column({ name: 'tlref_65_cdn', nullable: true })
  tlref65Cdn: string;

  @Column({ name: 'steu_desc_maj_dt', nullable: true })
  steuDescMajDt: string;

  @Column({ name: 'steu_suiv_maj_dt', nullable: true })
  steuSuivMajDt: string;

  @Column({ name: 'steu_concat_com_txt', nullable: true })
  steuConcatComTxt: string;

  @Column({ name: 'steu_old_sandre_cda', nullable: true })
  steuOldSandreCda: string;

  @Column({ name: 'steu_abs_a2_on', nullable: true })
  steuAbsA2On: string;

  @Column({ name: 'steu_devers_a2_on', nullable: true })
  steuDeversA2On: string;

  @Column({ name: 'steu_proj_dt', nullable: true })
  steuProjDt: string;

  @Column({ name: 'steu_service_an', nullable: true })
  steuServiceAn: string;

  @Column({ name: 'steu_avis_motive_on', nullable: true })
  steuAvisMotiveOn: string;

  @Column({ name: 'steu_mt_prev_trx_val', nullable: true })
  steuMtPrevTrxVal: string;

  @Column({ name: 'steu_mt_prev_trx_maj_dt', nullable: true })
  steuMtPrevTrxMajDt: string;

  @Column({ name: 'steu_suivi_trx_maj_dt', nullable: true })
  steuSuiviTrxMajDt: string;

  @Column({ name: 'steu_e_prtr_cda', nullable: true })
  steuEPrtrCda: string;

  @Column({ name: 'steu_inspire_id', nullable: true })
  steuInspireId: string;

  @Column({ name: 'steu_recept_cdn', nullable: true })
  steuReceptCdn: string;
}
