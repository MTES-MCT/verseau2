import { Entity, PrimaryColumn } from 'typeorm';

@Entity('sup', { schema: 'lanceleau', synchronize: false })
export class SupEntity {
  @PrimaryColumn({ name: 'sup_rfa' })
  supRfa: string;
}
