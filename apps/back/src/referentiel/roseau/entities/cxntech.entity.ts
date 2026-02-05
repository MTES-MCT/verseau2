import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('cxntech', { schema: 'roseau', synchronize: false })
export class CxntechEntity {
  @PrimaryColumn({ name: 'cxntech_cdn' }) // Assuming there is a PK, though not explicitly asked, TypeORM needs one.
  cxntechCdn: number;

  @Column({ name: 'aval_scl_cdn', nullable: true })
  avalSclCdn: number;

  @Column({ name: 'aval_steu_cdn', nullable: true })
  avalSteuCdn: number;

  @Column({ name: 'amont_zgc_cdn', nullable: true })
  amontZgcCdn: number;

  @Column({ name: 'cxntech_creation_dt', nullable: true })
  cxntechCreationDt: Date;

  @Column({ name: 'cxntech_retrait_dt', nullable: true })
  cxntechRetraitDt: Date;
}
