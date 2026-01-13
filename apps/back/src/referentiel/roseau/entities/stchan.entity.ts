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
}
