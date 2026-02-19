import { Column, Entity, PrimaryColumn } from 'typeorm';
import { trimTransformer } from '@database/trim.transformer';

@Entity('tltobl', { schema: 'roseau', synchronize: false })
export class TltoblEntity {
  @PrimaryColumn({ name: 'tltobl_rfa', transformer: trimTransformer })
  tltoblRfa: string;

  @Column({ name: 'tltobl_lb' })
  tltoblLb: string;
}
