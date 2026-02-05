import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('cxnadm', { schema: 'roseau', synchronize: false })
export class CxnadmEntity {
  @PrimaryColumn({ name: 'cxnadm_cdn' })
  cxnadmCdn: number;

  @Column({ name: 'mo_steu_cdn', nullable: true })
  moSteuCdn: number;

  @Column({ name: 'steu_itv_cdn', nullable: true })
  steuItvCdn: number;

  @Column({ name: 'exp_steu_cdn', nullable: true })
  expSteuCdn: number;
}
