import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('ag', { schema: 'lanceleau', synchronize: false })
export class AgEntity {
  @PrimaryColumn({ name: 'pr_cdn' })
  prCdn: number;

  @Column({ name: 'itv_cdn' })
  itvCdn: number;
}
