import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('ag', { schema: 'lanceleau', synchronize: false })
export class AgEntity {
  @PrimaryColumn({ name: 'pr_cdn' })
  prCdn: number;

  @Column({ name: 'itv_cdn' })
  itvCdn: number;

  @Column({ name: 'ag_nom_lb', type: 'varchar', nullable: true })
  agNomLb: string | null;

  @Column({ name: 'ag_prenom_lb', type: 'varchar', nullable: true })
  agPrenomLb: string | null;
}
