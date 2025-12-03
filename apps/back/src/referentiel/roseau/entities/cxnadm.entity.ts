import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('cxnadm', { schema: 'custom_ingestion_roseau', synchronize: false })
export class CxnadmEntity {
  @PrimaryColumn({ name: 'cxnadm_cdn' })
  cxnadmCdn: string;

  @Column({ name: 'mo_steu_cdn', nullable: true })
  moSteuCdn: string;

  @Column({ name: 'steu_itv_cdn', nullable: true })
  steuItvCdn: string;

  @Column({ name: 'exp_steu_cdn', nullable: true })
  expSteuCdn: string;
}
