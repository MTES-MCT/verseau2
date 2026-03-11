import { Column, Entity, PrimaryColumn } from 'typeorm';
import { trimTransformer } from '@database/trim.transformer';

@Entity('par', { schema: 'lanceleau', synchronize: false })
export class ParEntity {
  @PrimaryColumn({ name: 'par_rfa', transformer: trimTransformer })
  parRfa: string;

  @Column({ name: 'par_court_nom_lb', nullable: true })
  parCourtNomLb: string;
}
