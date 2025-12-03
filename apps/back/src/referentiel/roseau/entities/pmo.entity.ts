import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('pmo', { schema: 'custom_ingestion_roseau', synchronize: false })
export class PmoEntity {
  @PrimaryColumn({ name: 'pmo_cdn' })
  pmoCdn: string;

  @Column({ name: 'steu_cdn', nullable: true })
  steuCdn: string;

  @Column({ name: 'pmo_no', nullable: true })
  pmoNo: number;

  @Column({ name: 'tlref_16_cdn', nullable: true })
  tlref16Cdn: string;

  @Column({ name: 'pmo_val_deb_dt', type: 'date', nullable: true })
  pmoValDebDt: Date;

  @Column({ name: 'pmo_val_fin_dt', type: 'date', nullable: true })
  pmoValFinDt: Date;
}
