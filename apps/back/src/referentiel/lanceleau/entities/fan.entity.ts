import { Entity, PrimaryColumn } from 'typeorm';

@Entity('fan', { schema: 'lanceleau', synchronize: false })
export class FanEntity {
  @PrimaryColumn({ name: 'fan_rfa' })
  fanRfa: string;
}
