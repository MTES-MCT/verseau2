import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('ag', { schema: 'custom_ingestion_lanceleau', synchronize: false })
export class AgEntity {
  @PrimaryColumn({ name: 'pr_cdn' })
  prCdn: string;

  @Column({ name: 'itv_cdn' })
  itvCdn: string;
}
