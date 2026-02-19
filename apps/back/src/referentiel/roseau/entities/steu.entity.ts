import { Column, Entity, PrimaryColumn } from 'typeorm';
import { trimTransformer } from '@database/trim.transformer';

@Entity('steu', { schema: 'roseau', synchronize: false })
export class SteuEntity {
  @PrimaryColumn({ name: 'steu_cdn' })
  steuCdn: number;

  @Column({ name: 'ag_cdn', nullable: true })
  agCdn: number;

  @Column({ name: 'inst_ag_cdn', nullable: true })
  instAgCdn: number;

  @Column({ name: 'tlref_35_cdn', nullable: true })
  tlref35Cdn: number;

  @Column({ name: 'sti_cdn', nullable: true })
  stiCdn: number;

  @Column({ name: 'tlref_01_cdn', nullable: true })
  tlref01Cdn: number;

  @Column({ name: 'tlref_11_cdn', nullable: true })
  tlref11Cdn: number;

  @Column({ name: 'tlref_12_cdn', nullable: true })
  tlref12Cdn: number;

  @Column({ name: 'zgc_cdn', nullable: true })
  zgcCdn: number;

  @Column({ name: 'orm_cdn', nullable: true })
  ormCdn: number;

  @Column({ name: 'tlref_07_cdn', nullable: true })
  tlref07Cdn: number;

  @Column({ name: 'inst_itv_cdn', nullable: true })
  instItvCdn: number;

  @Column({ name: 'tlref_10_cdn', nullable: true })
  tlref10Cdn: number;

  @Column({ name: 'tlref_09_cdn', nullable: true })
  tlref09Cdn: number;

  @Column({ name: 'tlref_06_cdn', nullable: true })
  tlref06Cdn: number;

  @Column({ name: 'ae_itv_cdn', nullable: true })
  aeItvCdn: number;

  @Column({ name: 'steu_sandre_cda', nullable: true, transformer: trimTransformer })
  steuSandreCda: string;

  @Column({ name: 'steu_nom_lb', nullable: true })
  steuNomLb: string;

  @Column({ name: 'steu_x_coord_no', nullable: true, type: 'numeric' })
  steuXCoordNo: number;

  @Column({ name: 'steu_y_coord_no', nullable: true, type: 'numeric' })
  steuYCoordNo: number;

  @Column({ name: 'steu_serv_en_mise_dt', nullable: true })
  steuServEnMiseDt: Date;

  @Column({ name: 'steu_serv_hors_mise_dt', nullable: true })
  steuServHorsMiseDt: Date;

  @Column({ name: 'steu_cdb_rfa', nullable: true, transformer: trimTransformer })
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
  steuAsManuelOn: boolean;

  @Column({ name: 'steu_as_manuel_val_dt', nullable: true })
  steuAsManuelValDt: Date;

  @Column({ name: 'steu_pe_exist_in', nullable: true, transformer: trimTransformer })
  steuPeExistIn: string;

  @Column({ name: 'steu_com_txt', nullable: true })
  steuComTxt: string;

  @Column({ name: 'steu_ech_trav_desc_txt', nullable: true })
  steuEchTravDescTxt: string;

  @Column({ name: 'steu_maj_dt', nullable: true })
  steuMajDt: Date;

  @Column({ name: 'steu_eh_val_ent_max_chg_val', nullable: true, type: 'numeric' })
  steuEhValEntMaxChgVal: number;

  @Column({ name: 'steu_eh_trait_nom_cap_val', nullable: true, type: 'numeric' })
  steuEhTraitNomCapVal: number;

  @Column({ name: 'steu_encours_an', nullable: true, type: 'numeric' })
  steuEncoursAn: number;

  @Column({ name: 'steu_ae_certif_code_on', nullable: true })
  steuAeCertifCodeOn: boolean;

  @Column({ name: 'steu_lon_coord_no', nullable: true, type: 'numeric' })
  steuLonCoordNo: number;

  @Column({ name: 'steu_lat_coord_no', nullable: true, type: 'numeric' })
  steuLatCoordNo: number;

  @Column({ name: 'tlref_65_cdn', nullable: true })
  tlref65Cdn: number;

  @Column({ name: 'steu_desc_maj_dt', nullable: true })
  steuDescMajDt: Date;

  @Column({ name: 'steu_suiv_maj_dt', nullable: true })
  steuSuivMajDt: Date;

  @Column({ name: 'steu_concat_com_txt', nullable: true })
  steuConcatComTxt: string;

  @Column({ name: 'steu_old_sandre_cda', nullable: true })
  steuOldSandreCda: string;

  @Column({ name: 'steu_abs_a2_on', nullable: true })
  steuAbsA2On: boolean;

  @Column({ name: 'steu_devers_a2_on', nullable: true })
  steuDeversA2On: boolean;

  @Column({ name: 'steu_proj_dt', type: 'date', nullable: true })
  steuProjDt: Date;

  @Column({ name: 'steu_service_an', nullable: true, type: 'numeric' })
  steuServiceAn: number;

  @Column({ name: 'steu_avis_motive_on', nullable: true })
  steuAvisMotiveOn: boolean;

  @Column({ name: 'steu_mt_prev_trx_val', nullable: true, type: 'numeric' })
  steuMtPrevTrxVal: number;

  @Column({ name: 'steu_mt_prev_trx_maj_dt', type: 'date', nullable: true })
  steuMtPrevTrxMajDt: Date;

  @Column({ name: 'steu_suivi_trx_maj_dt', type: 'date', nullable: true })
  steuSuiviTrxMajDt: Date;

  @Column({ name: 'steu_e_prtr_cda', nullable: true })
  steuEPrtrCda: string;

  @Column({ name: 'steu_inspire_id', nullable: true })
  steuInspireId: string;

  @Column({ name: 'steu_recept_cdn', nullable: true })
  steuReceptCdn: number;
}
