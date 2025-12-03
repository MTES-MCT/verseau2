import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('sup', { schema: 'custom_ingestion_lanceleau', synchronize: false })
export class SupEntity {
  @PrimaryColumn({ name: 'sup_rfa' })
  supRfa: string;
}
