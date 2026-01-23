import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('agat', { schema: 'roseau', synchronize: false })
export class AgatEntity {
  @PrimaryColumn({ name: 'aga_cdn' })
  agaCdn: string;

  @PrimaryColumn({ name: 'agat_taille_an' })
  agatTailleAn: number;

  @Column({ name: 'agat_cbpo_val', type: 'numeric', nullable: true })
  agatCbpoVal: number;

  @Column({ name: 'agat_ent_calc_max_chg_som_val', type: 'numeric', nullable: true })
  agatEntCalcMaxChgSomVal: number;
}
