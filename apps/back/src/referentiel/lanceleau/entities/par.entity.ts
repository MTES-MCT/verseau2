import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('par', { schema: 'custom_ingestion_lanceleau', synchronize: false })
export class ParEntity {
  @PrimaryColumn({ name: 'par_rfa' })
  parRfa: string;
}
