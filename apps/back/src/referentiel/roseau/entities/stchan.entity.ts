import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('stchan', { schema: 'roseau', synchronize: false })
export class StchanEntity {
  @PrimaryColumn({ name: 'steu_cdn' })
  steuCdn: string;

  @PrimaryColumn({ name: 'stchan_an', type: 'int' })
  stchanAn: number;

  @Column({ name: 'stchan_r_eh_max_chg_val', nullable: true, type: 'numeric' })
  stchanREhMaxChgVal: number | null;

  @Column({ name: 'stchan_pc95_val', nullable: true, type: 'numeric' })
  stchanPc95Val: number | null;

  @Column({ name: 'stchan_r_1an_jr_deb_95_perc_val', nullable: true, type: 'numeric' })
  stchanR1anJrDeb95PercVal: number | null;

  @Column({ name: 'stchan_r_2ans_jr_deb_95_perc_val', nullable: true, type: 'numeric' })
  stchanR2ansJrDeb95PercVal: number | null;

  @Column({ name: 'stchan_r_3ans_jr_deb_95_perc_val', nullable: true, type: 'numeric' })
  stchanR3ansJrDeb95PercVal: number | null;

  @Column({ name: 'stchan_r_4ans_jr_deb_95_perc_val', nullable: true, type: 'numeric' })
  stchanR4ansJrDeb95PercVal: number | null;

  @Column({ name: 'stchan_r_5ans_jr_deb_95_perc_val', nullable: true, type: 'numeric' })
  stchanR5ansJrDeb95PercVal: number | null;
}
