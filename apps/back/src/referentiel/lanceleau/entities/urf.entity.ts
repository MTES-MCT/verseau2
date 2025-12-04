import { Entity, PrimaryColumn } from 'typeorm';

@Entity('urf', { schema: 'custom_ingestion_lanceleau', synchronize: false })
export class UrfEntity {
  @PrimaryColumn({ name: 'urf_rfa' })
  urfRfa: string;
}
