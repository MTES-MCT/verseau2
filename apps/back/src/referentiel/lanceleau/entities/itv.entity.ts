import { trimTransformer } from '@database/trim.transformer';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('itv', { schema: 'lanceleau', synchronize: false })
export class ItvEntity {
  @PrimaryColumn({ name: 'itv_cdn' })
  itvCdn: number;

  @Column({ name: 'peti_cdn', nullable: true })
  petiCdn: number;

  @Column({ name: 'dir_itv_cdn', nullable: true })
  dirItvCdn: number;

  @Column({ name: 'actpe_cdn', nullable: true })
  actpeCdn: number;

  @Column({ name: 'titv_rfa', nullable: true })
  titvRfa: string;

  @Column({ name: 'adr_cdn', nullable: true })
  adrCdn: number;

  @Column({ name: 'itv_rfa', nullable: true, transformer: trimTransformer })
  itvRfa: string;

  @Column({ name: 'itv_origine_lb', nullable: true })
  itvOrigineLb: string;

  @Column({ name: 'itv_nom_lb', nullable: true })
  itvNomLb: string;

  @Column({ name: 'itv_statut_lb', nullable: true })
  itvStatutLb: string;

  @Column({ name: 'itv_cre_dt', nullable: true })
  itvCreDt: Date;

  @Column({ name: 'itv_maj_dt', nullable: true })
  itvMajDt: Date;

  @Column({ name: 'itv_mnemo_lb', nullable: true })
  itvMnemoLb: string;

  @Column({ name: 'itv_com_txt', nullable: true })
  itvComTxt: string;

  @Column({ name: 'itv_nom_inter_lb', nullable: true })
  itvNomInterLb: string;

  @Column({ name: 'itv_siret_rfa', nullable: true })
  itvSiretRfa: string;

  @Column({ name: 'itv_orig_rfa', nullable: true })
  itvOrigRfa: string;

  @Column({ name: 'itv_val_deb_dt', nullable: true })
  itvValDebDt: Date;

  @Column({ name: 'itv_val_fin_dt', nullable: true })
  itvValFinDt: Date;

  @Column({ name: 'itv_pacage_cda', nullable: true })
  itvPacageCda: string;

  @Column({ name: 'itv_etranger_on', nullable: true })
  itvEtrangerOn: boolean;

  @Column({ name: 'itv_attente_sandre_on', nullable: true })
  itvAttenteSandreOn: boolean;

  @Column({ name: 'itv_histo_pr_cdn', nullable: true, type: 'numeric' })
  itvHistoPrCdn: number;

  @Column({ name: 'itv_crea_cdn', nullable: true, type: 'numeric' })
  itvCreaCdn: number;

  @Column({ name: 'naf_rfa', nullable: true })
  nafRfa: string;

  @Column({ name: 'w_bdnu_uf_cdn', nullable: true })
  wBdnuUfCdn: number;

  @Column({ name: 'itv_id', nullable: true })
  itvId: number;

  @Column({ name: 'orga_cdn', nullable: true })
  orgaCdn: number;

  @Column({ name: 'w_bdnu_uf_2014_cdn', nullable: true })
  wBdnuUf2014Cdn: number;

  @Column({ name: 'ougc_cdn', nullable: true })
  ougcCdn: number;

  @Column({ name: 'itv_confiance_on', nullable: true })
  itvConfianceOn: boolean;

  @Column({ name: 'itv_nom_phonetise_lb', nullable: true })
  itvNomPhonetiseLb: string;

  @Column({ name: 'itv_siege_on', nullable: true })
  itvSiegeOn: boolean;

  @Column({ name: 'itv_diffusible_on', nullable: true })
  itvDiffusibleOn: boolean;

  @Column({ name: 'itv_serv_corres_rfa', nullable: true })
  itvServCorresRfa: string;
}
