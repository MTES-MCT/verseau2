import { Column, Entity, PrimaryColumn } from 'typeorm';
import { trimTransformer } from '@database/trim.transformer';

@Entity('alr', { schema: 'roseau', synchronize: false })
export class AlrEntity {
  @PrimaryColumn({ name: 'alr_cdn' })
  alrCdn: number;

  @Column({ name: 'ple_cdn', nullable: true })
  pleCdn: number;

  @Column({ name: 'par_rfa', nullable: true, transformer: trimTransformer })
  parRfa: string;

  @Column({ name: 'urf_rfa', nullable: true, transformer: trimTransformer })
  urfRfa: string;

  @Column({ name: 'alr_res_val', type: 'numeric', nullable: true })
  alrResVal: number;

  @Column({ name: 'tlref_20_cdn', nullable: true })
  tlref20Cdn: number;

  @Column({ name: 'tlref_18_cdn', nullable: true })
  tlref18Cdn: number;

  @Column({ name: 'tlref_17_cdn', nullable: true })
  tlref17Cdn: number;
}
