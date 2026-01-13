import { Entity, PrimaryColumn } from 'typeorm';

@Entity('urf', { schema: 'lanceleau', synchronize: false })
export class UrfEntity {
  @PrimaryColumn({ name: 'urf_rfa' })
  urfRfa: string;
}
