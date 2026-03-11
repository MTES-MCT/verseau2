import { Column, Entity, PrimaryColumn } from 'typeorm';
import { trimTransformer } from '@database/trim.transformer';

@Entity('urf', { schema: 'lanceleau', synchronize: false })
export class UrfEntity {
  @PrimaryColumn({ name: 'urf_rfa', transformer: trimTransformer })
  urfRfa: string;

  @Column({ name: 'urf_symb_lb', nullable: true })
  urfSymbLb: string;
}
