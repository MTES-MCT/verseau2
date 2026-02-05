import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('cpy', { schema: 'roseau', synchronize: false })
export class CpyEntity {
  @PrimaryColumn({ name: 'cpy_cdn' })
  cpyCdn: number;

  @Column({ name: 'steu_cdn', nullable: true })
  steuCdn: number;

  @Column({ name: 'cpy_eh_trait_nom_cap_mt', nullable: true, type: 'numeric' })
  cpyEhTraitNomCapMt: number | null;

  @Column({ name: 'cpy_ref_debit_mt', nullable: true, type: 'numeric' })
  cpyRefDebitMt: number | null;

  @Column({ name: 'cpy_an', type: 'numeric' })
  cpyAn: number;
}
