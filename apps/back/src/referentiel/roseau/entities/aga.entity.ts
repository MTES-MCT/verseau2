import { Column, Entity, PrimaryColumn } from 'typeorm';
import { trimTransformer } from '@database/trim.transformer';

@Entity('aga', { schema: 'roseau', synchronize: false })
export class AgaEntity {
  @PrimaryColumn({ name: 'aga_cdn' })
  agaCdn: number;

  @Column({ name: 'tltobl_rfa', nullable: true, transformer: trimTransformer })
  tltoblRfa: string;

  @Column({ name: 'itv_cdn', nullable: true })
  itvCdn: number;

  @Column({ name: 'zgc_cdn', nullable: true })
  zgcCdn: number;

  @Column({ name: 'ag_cdn', nullable: true })
  agCdn: number;

  @Column({ name: 'tlr_01_cdn', nullable: true })
  tlr01Cdn: number;

  @Column({ name: 'tlref_03_cdn', nullable: true })
  tlref03Cdn: number;

  @Column({ name: 'maj_ag_cdn', nullable: true })
  majAgCdn: number;

  @Column({ name: 'aga_sandre_cda', nullable: true, transformer: trimTransformer })
  agaSandreCda: string;

  @Column({ name: 'aga_nom_lb', nullable: true })
  agaNomLb: string;

  @Column({ name: 'aga_nom_compl_lb', nullable: true })
  agaNomComplLb: string;

  @Column({ name: 'aga_cdb_rfa', nullable: true, transformer: trimTransformer })
  agaCdbRfa: string;

  @Column({ name: 'aga_reg_rfa', nullable: true })
  agaRegRfa: string;

  @Column({ name: 'aga_dep_rfa', nullable: true })
  agaDepRfa: string;

  @Column({ name: 'aga_com_rfa', nullable: true })
  agaComRfa: string;

  @Column({ name: 'aga_crea_an', nullable: true, type: 'numeric' })
  agaCreaAn: number;

  @Column({ name: 'aga_clos_an', nullable: true, type: 'numeric' })
  agaClosAn: number;

  @Column({ name: 'aga_encours_an', nullable: true, type: 'numeric' })
  agaEncoursAn: number;

  @Column({ name: 'aga_eh_cbpo_val', nullable: true, type: 'numeric' })
  agaEhCbpoVal: number;

  @Column({ name: 'aga_steu_nomi_capa_som_val', nullable: true, type: 'numeric' })
  agaSteuNomiCapaSomVal: number;

  @Column({ name: 'aga_conf_in', nullable: true, transformer: trimTransformer })
  agaConfIn: string;

  @Column({ name: 'aga_perf_conf_in', nullable: true, transformer: trimTransformer })
  agaPerfConfIn: string;

  @Column({ name: 'aga_equip_conf_in', nullable: true, transformer: trimTransformer })
  agaEquipConfIn: string;

  @Column({ name: 'aga_equip_conf_dt', nullable: true })
  agaEquipConfDt: Date;

  @Column({ name: 'aga_zgc_conf_in', nullable: true, transformer: trimTransformer })
  agaZgcConfIn: string;

  @Column({ name: 'aga_zgc_conf_dt', nullable: true })
  agaZgcConfDt: Date;

  @Column({ name: 'aga_com_txt', nullable: true })
  agaComTxt: string;

  @Column({ name: 'aga_steu_nb', nullable: true, type: 'numeric' })
  agaSteuNb: number;

  @Column({ name: 'aga_cre_dt', nullable: true })
  agaCreDt: Date;

  @Column({ name: 'aga_maj_dt', nullable: true })
  agaMajDt: Date;

  @Column({ name: 'tlref_64_cdn', nullable: true })
  tlref64Cdn: number;

  @Column({ name: 'aga_concat_com_txt', nullable: true })
  agaConcatComTxt: string;

  @Column({ name: 'aga_desc_maj_dt', nullable: true })
  agaDescMajDt: Date;

  @Column({ name: 'aga_suiv_maj_dt', nullable: true })
  agaSuivMajDt: Date;

  @Column({ name: 'aga_loc_conf_in', nullable: true, transformer: trimTransformer })
  agaLocConfIn: string;

  @Column({ name: 'aga_loc_perf_conf_in', nullable: true, transformer: trimTransformer })
  agaLocPerfConfIn: string;

  @Column({ name: 'aga_loc_equip_conf_in', nullable: true, transformer: trimTransformer })
  agaLocEquipConfIn: string;

  @Column({ name: 'aga_loc_equip_conf_dt', nullable: true })
  agaLocEquipConfDt: Date;

  @Column({ name: 'aga_zgc_loc_conf_in', nullable: true, transformer: trimTransformer })
  agaZgcLocConfIn: string;

  @Column({ name: 'aga_zgc_loc_conf_dt', nullable: true })
  agaZgcLocConfDt: Date;

  @Column({ name: 'aga_big_city_rfa', nullable: true })
  agaBigCityRfa: string;

  @Column({ name: 'aga_nuts_rfa', nullable: true })
  agaNutsRfa: string;

  @Column({ name: 'aga_recept_cdn', nullable: true })
  agaReceptCdn: number;

  @Column({ name: 'aga_cent_x_coord_no', nullable: true, type: 'numeric' })
  agaCentXCoordNo: number;

  @Column({ name: 'aga_cent_y_coord_no', nullable: true, type: 'numeric' })
  agaCentYCoordNo: number;
}
