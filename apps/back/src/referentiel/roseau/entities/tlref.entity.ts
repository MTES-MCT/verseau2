import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('tlref', { schema: 'custom_ingestion_roseau', synchronize: false })
export class TlrefEntity {
  @PrimaryColumn({ name: 'tlref_cdn' })
  tlrefCdn: string;

  @Column({ name: 'trl_rfa', nullable: true })
  trlRfa: string;

  @Column({ name: 'tlref_elt_cda', nullable: true })
  tlrefEltCda: string;
}
