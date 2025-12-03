import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('fan', { schema: 'custom_ingestion_lanceleau', synchronize: false })
export class FanEntity {
  @PrimaryColumn({ name: 'fan_rfa' })
  fanRfa: string;
}
