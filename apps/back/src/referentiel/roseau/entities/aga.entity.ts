import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('aga', { schema: 'custom_ingestion_roseau', synchronize: false })
export class AgaEntity {
  @PrimaryColumn({ name: 'aga_cdn' })
  agaCdn: string;

  @Column({ name: 'tltobl_rfa', nullable: true })
  tltoblRfa: string;

  @Column({ name: 'itv_cdn', nullable: true })
  itvCdn: string;

  @Column({ name: 'zgc_cdn', nullable: true })
  zgcCdn: string;

  @Column({ name: 'ag_cdn', nullable: true })
  agCdn: string;

  @Column({ name: 'tlr_01_cdn', nullable: true })
  tlr01Cdn: string;

  @Column({ name: 'tlref_03_cdn', nullable: true })
  tlref03Cdn: string;

  @Column({ name: 'maj_ag_cdn', nullable: true })
  majAgCdn: string;

  @Column({ name: 'aga_sandre_cda', nullable: true })
  agaSandreCda: string;

  @Column({ name: 'aga_nom_lb', nullable: true })
  agaNomLb: string;

  @Column({ name: 'aga_nom_compl_lb', nullable: true })
  agaNomComplLb: string;

  @Column({ name: 'aga_cdb_rfa', nullable: true })
  agaCdbRfa: string;

  @Column({ name: 'aga_reg_rfa', nullable: true })
  agaRegRfa: string;

  @Column({ name: 'aga_dep_rfa', nullable: true })
  agaDepRfa: string;

  @Column({ name: 'aga_com_rfa', nullable: true })
  agaComRfa: string;

  @Column({ name: 'aga_crea_an', nullable: true })
  agaCreaAn: string;

  @Column({ name: 'aga_clos_an', nullable: true })
  agaClosAn: string;

  @Column({ name: 'aga_encours_an', nullable: true })
  agaEncoursAn: string;

  @Column({ name: 'aga_eh_cbpo_val', nullable: true })
  agaEhCbpoVal: string;

  @Column({ name: 'aga_steu_nomi_capa_som_val', nullable: true })
  agaSteuNomiCapaSomVal: string;

  @Column({ name: 'aga_conf_in', nullable: true })
  agaConfIn: string;

  @Column({ name: 'aga_perf_conf_in', nullable: true })
  agaPerfConfIn: string;

  @Column({ name: 'aga_equip_conf_in', nullable: true })
  agaEquipConfIn: string;

  @Column({ name: 'aga_equip_conf_dt', nullable: true })
  agaEquipConfDt: string;

  @Column({ name: 'aga_zgc_conf_in', nullable: true })
  agaZgcConfIn: string;

  @Column({ name: 'aga_zgc_conf_dt', nullable: true })
  agaZgcConfDt: string;

  @Column({ name: 'aga_com_txt', nullable: true })
  agaComTxt: string;

  @Column({ name: 'aga_steu_nb', nullable: true })
  agaSteuNb: string;

  @Column({ name: 'aga_cre_dt', nullable: true })
  agaCreDt: string;

  @Column({ name: 'aga_maj_dt', nullable: true })
  agaMajDt: string;

  @Column({ name: 'tlref_64_cdn', nullable: true })
  tlref64Cdn: string;

  @Column({ name: 'aga_concat_com_txt', nullable: true })
  agaConcatComTxt: string;

  @Column({ name: 'aga_desc_maj_dt', nullable: true })
  agaDescMajDt: string;

  @Column({ name: 'aga_suiv_maj_dt', nullable: true })
  agaSuivMajDt: string;

  @Column({ name: 'aga_loc_conf_in', nullable: true })
  agaLocConfIn: string;

  @Column({ name: 'aga_loc_perf_conf_in', nullable: true })
  agaLocPerfConfIn: string;

  @Column({ name: 'aga_loc_equip_conf_in', nullable: true })
  agaLocEquipConfIn: string;

  @Column({ name: 'aga_loc_equip_conf_dt', nullable: true })
  agaLocEquipConfDt: string;

  @Column({ name: 'aga_zgc_loc_conf_in', nullable: true })
  agaZgcLocConfIn: string;

  @Column({ name: 'aga_zgc_loc_conf_dt', nullable: true })
  agaZgcLocConfDt: string;

  @Column({ name: 'aga_big_city_rfa', nullable: true })
  agaBigCityRfa: string;

  @Column({ name: 'aga_nuts_rfa', nullable: true })
  agaNutsRfa: string;

  @Column({ name: 'aga_recept_cdn', nullable: true })
  agaReceptCdn: string;

  @Column({ name: 'aga_cent_x_coord_no', nullable: true })
  agaCentXCoordNo: string;

  @Column({ name: 'aga_cent_y_coord_no', nullable: true })
  agaCentYCoordNo: string;
}
