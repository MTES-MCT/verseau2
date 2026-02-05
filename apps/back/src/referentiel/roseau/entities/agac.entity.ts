import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('agac', { schema: 'roseau', synchronize: false })
export class AgacEntity {
  @PrimaryColumn({ name: 'aga_cdn' })
  agaCdn: number;

  @Column({ name: 'agac_conf_an', type: 'numeric' })
  agacConfAn: number;
}
