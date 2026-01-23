import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('tltobl', { schema: 'roseau', synchronize: false })
export class TltoblEntity {
  @PrimaryColumn({ name: 'tltobl_rfa' })
  tltoblRfa: string;

  @Column({ name: 'tltobl_lb' })
  tltoblLb: string;
}
