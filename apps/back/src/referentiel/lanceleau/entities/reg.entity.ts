import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('reg', { schema: 'lanceleau', synchronize: false })
export class RegEntity {
  @PrimaryColumn({ name: 'reg_rfa' })
  regRfa: string;

  @Column({ name: 'reg_lb' })
  regLb: string;
}
