import { Entity, PrimaryColumn } from 'typeorm';
import { trimTransformer } from '@database/trim.transformer';

@Entity('sup', { schema: 'lanceleau', synchronize: false })
export class SupEntity {
  @PrimaryColumn({ name: 'sup_rfa', transformer: trimTransformer })
  supRfa: string;
}
