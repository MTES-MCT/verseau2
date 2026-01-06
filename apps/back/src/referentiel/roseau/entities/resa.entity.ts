import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('resa', { schema: 'custom_ingestion_roseau', synchronize: false })
export class ResaEntity {
  @PrimaryColumn({ name: 'resa_cdn' })
  resaCdn: string;

  @Column({ name: 'steu_cdn', nullable: true })
  steuCdn: string;

  @Column({ name: 'resa_an', nullable: true })
  resaAn: number;

  @Column({ name: 'par_rfa', nullable: true })
  parRfa: string;

  @Column({ name: 'resa_cma_val', type: 'numeric', nullable: true })
  resaCmaVal: number;
}
