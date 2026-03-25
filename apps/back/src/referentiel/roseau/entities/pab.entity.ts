import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('pab', { schema: 'roseau', synchronize: false })
export class PabEntity {
  @PrimaryColumn({ name: 'pab_cdn' })
  pabCdn: number;

  @Column({ name: 'steu_cdn', nullable: true })
  steuCdn: number;

  @Column({ name: 'pab_an', nullable: true, type: 'numeric' })
  pabAn: number;

  @Column({ name: 'pab_an_reac_hors_prod_r_val', nullable: true, type: 'numeric' })
  pabAnReacHorsProdRVal: number;
}
