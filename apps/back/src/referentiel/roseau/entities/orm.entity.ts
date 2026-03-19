import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('orm', { schema: 'roseau', synchronize: false })
export class OrmEntity {
  @PrimaryColumn({ name: 'orm_cdn' })
  ormCdn: number;

  @Column({ name: 'pmo_cdn', nullable: true })
  pmoCdn: number;

  @Column({ name: 'tlref_24_cdn', nullable: true })
  tlref24Cdn: number;
}
