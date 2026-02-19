import { Column, Entity, PrimaryColumn } from 'typeorm';
import { trimTransformer } from '@database/trim.transformer';

@Entity('scl', { schema: 'roseau', synchronize: false })
export class SclEntity {
  @PrimaryColumn({ name: 'scl_cdn' })
  sclCdn: number;

  @Column({ name: 'tlref_02_cdn', nullable: true })
  tlref02Cdn: number;

  @Column({ name: 'zgc_cdn', nullable: true })
  zgcCdn: number;

  @Column({ name: 'tlref_05_cdn', nullable: true })
  tlref05Cdn: number;

  @Column({ name: 'steu_cdn', nullable: true })
  steuCdn: number;

  @Column({ name: 'tlref_01_cdn', nullable: true })
  tlref01Cdn: number;

  @Column({ name: 'scl_sandre_cda', nullable: true })
  sclSandreCda: string;

  @Column({ name: 'scl_lb', nullable: true })
  sclLb: string;

  @Column({ name: 'scl_com_txt', nullable: true })
  sclComTxt: string;

  @Column({ name: 'scl_trx_desc_txt', nullable: true })
  sclTrxDescTxt: string;

  @Column({ name: 'scl_autosurv_val_in', nullable: true, transformer: trimTransformer })
  sclAutosurvValIn: string;

  @Column({ name: 'scl_direct_rejet_exist_in', nullable: true, transformer: trimTransformer })
  sclDirectRejetExistIn: string;

  @Column({ name: 'scl_as_manuel_on', nullable: true })
  sclAsManuelOn: boolean;

  @Column({ name: 'scl_as_manuel_val_dt', nullable: true })
  sclAsManuelValDt: Date;

  @Column({ name: 'tlref_66_cdn', nullable: true })
  tlref66Cdn: number;

  @Column({ name: 'scl_old_sandre_cda', nullable: true })
  sclOldSandreCda: string;

  @Column({ name: 'scl_encours_an', nullable: true, type: 'numeric' })
  sclEncoursAn: number;

  @Column({ name: 'scl_ts_trx_desc_txt', nullable: true })
  sclTsTrxDescTxt: string;

  @Column({ name: 'tlref_ts_66_cdn', nullable: true })
  tlrefTs66Cdn: number;

  @Column({ name: 'scl_mt_prev_trx_ts_val', nullable: true, type: 'numeric' })
  sclMtPrevTrxTsVal: number;

  @Column({ name: 'scl_mt_prev_trx_ts_maj_dt', type: 'date', nullable: true })
  sclMtPrevTrxTsMajDt: Date;

  @Column({ name: 'scl_mt_prev_trx_tp_val', nullable: true, type: 'numeric' })
  sclMtPrevTrxTpVal: number;

  @Column({ name: 'scl_mt_prev_trx_tp_maj_dt', type: 'date', nullable: true })
  sclMtPrevTrxTpMajDt: Date;

  @Column({ name: 'scl_suivi_trx_ts_maj_dt', type: 'date', nullable: true })
  sclSuiviTrxTsMajDt: Date;

  @Column({ name: 'scl_suivi_trx_tp_maj_dt', type: 'date', nullable: true })
  sclSuiviTrxTpMajDt: Date;
}
