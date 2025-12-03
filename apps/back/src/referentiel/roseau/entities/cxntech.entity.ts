import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('cxntech', { schema: 'custom_ingestion_roseau', synchronize: false })
export class CxntechEntity {
  @PrimaryColumn({ name: 'cxntech_cdn' }) // Assuming there is a PK, though not explicitly asked, TypeORM needs one.
  cxntechCdn: string;

  @Column({ name: 'aval_scl_cdn', nullable: true })
  avalSclCdn: string;

  @Column({ name: 'amont_zgc_cdn', nullable: true })
  amontZgcCdn: string;

  @Column({ name: 'cxntech_retrait_dt', type: 'date', nullable: true })
  cxntechRetraitDt: Date;
}
