import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('ple', { schema: 'roseau', synchronize: false })
export class PleEntity {
  @PrimaryColumn({ name: 'ple_cdn' })
  pleCdn: number;

  @Column({ name: 'pmo_cdn', nullable: true })
  pmoCdn: number;

  @Column({ name: 'ple_prelev_dt', type: 'timestamp', nullable: true })
  plePrelevDt: Date;
}
