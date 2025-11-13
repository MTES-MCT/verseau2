import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('scl', { schema: 'custom_ingestion_roseau', synchronize: false })
export class SclEntity {
  @PrimaryColumn({ name: 'scl_cdn' })
  sclCdn: string;

  @Column({ name: 'tlref_02_cdn', nullable: true })
  tlref02Cdn: string;

  @Column({ name: 'zgc_cdn', nullable: true })
  zgcCdn: string;

  @Column({ name: 'tlref_05_cdn', nullable: true })
  tlref05Cdn: string;

  @Column({ name: 'steu_cdn', nullable: true })
  steuCdn: string;

  @Column({ name: 'tlref_01_cdn', nullable: true })
  tlref01Cdn: string;

  @Column({ name: 'scl_sandre_cda', nullable: true })
  sclSandreCda: string;

  @Column({ name: 'scl_lb', nullable: true })
  sclLb: string;

  @Column({ name: 'scl_com_txt', nullable: true })
  sclComTxt: string;

  @Column({ name: 'scl_trx_desc_txt', nullable: true })
  sclTrxDescTxt: string;

  @Column({ name: 'scl_autosurv_val_in', nullable: true })
  sclAutosurvValIn: string;

  @Column({ name: 'scl_direct_rejet_exist_in', nullable: true })
  sclDirectRejetExistIn: string;

  @Column({ name: 'scl_as_manuel_on', nullable: true })
  sclAsManuelOn: string;

  @Column({ name: 'scl_as_manuel_val_dt', nullable: true })
  sclAsManuelValDt: string;

  @Column({ name: 'tlref_66_cdn', nullable: true })
  tlref66Cdn: string;

  @Column({ name: 'scl_old_sandre_cda', nullable: true })
  sclOldSandreCda: string;

  @Column({ name: 'scl_encours_an', nullable: true })
  sclEncoursAn: string;

  @Column({ name: 'scl_ts_trx_desc_txt', nullable: true })
  sclTsTrxDescTxt: string;

  @Column({ name: 'tlref_ts_66_cdn', nullable: true })
  tlrefTs66Cdn: string;

  @Column({ name: 'scl_mt_prev_trx_ts_val', nullable: true })
  sclMtPrevTrxTsVal: string;

  @Column({ name: 'scl_mt_prev_trx_ts_maj_dt', nullable: true })
  sclMtPrevTrxTsMajDt: string;

  @Column({ name: 'scl_mt_prev_trx_tp_val', nullable: true })
  sclMtPrevTrxTpVal: string;

  @Column({ name: 'scl_mt_prev_trx_tp_maj_dt', nullable: true })
  sclMtPrevTrxTpMajDt: string;

  @Column({ name: 'scl_suivi_trx_ts_maj_dt', nullable: true })
  sclSuiviTrxTsMajDt: string;

  @Column({ name: 'scl_suivi_trx_tp_maj_dt', nullable: true })
  sclSuiviTrxTpMajDt: string;
}
