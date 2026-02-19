import { Entity, PrimaryColumn } from 'typeorm';
import { trimTransformer } from '@database/trim.transformer';

@Entity('fan', { schema: 'lanceleau', synchronize: false })
export class FanEntity {
  @PrimaryColumn({ name: 'fan_rfa', transformer: trimTransformer })
  fanRfa: string;
}
