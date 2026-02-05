import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('pmo', { schema: 'roseau', synchronize: false })
export class PmoEntity {
  @PrimaryColumn({ name: 'pmo_cdn' })
  pmoCdn: number;

  @Column({ name: 'steu_cdn', nullable: true })
  steuCdn: number;

  @Column({ name: 'pmo_no', nullable: true })
  pmoNo: string;

  @Column({ name: 'tlref_16_cdn', nullable: true })
  tlref16Cdn: number;

  @Column({ name: 'pmo_val_deb_dt', type: 'date', nullable: true })
  pmoValDebDt: Date;

  @Column({ name: 'pmo_val_fin_dt', type: 'date', nullable: true })
  pmoValFinDt: Date;
}
