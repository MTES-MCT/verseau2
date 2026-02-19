import { Column, Entity, PrimaryColumn } from 'typeorm';
import { trimTransformer } from '@database/trim.transformer';

@Entity('resa', { schema: 'roseau', synchronize: false })
export class ResaEntity {
  @PrimaryColumn({ name: 'resa_cdn' })
  resaCdn: number;

  @Column({ name: 'steu_cdn', nullable: true })
  steuCdn: number;

  @Column({ name: 'resa_an', nullable: true, type: 'numeric' })
  resaAn: number;

  @Column({ name: 'par_rfa', nullable: true, transformer: trimTransformer })
  parRfa: string;

  @Column({ name: 'resa_cma_val', type: 'numeric', nullable: true })
  resaCmaVal: number;
}
