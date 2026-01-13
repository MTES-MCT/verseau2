import { Entity, PrimaryColumn } from 'typeorm';

@Entity('par', { schema: 'lanceleau', synchronize: false })
export class ParEntity {
  @PrimaryColumn({ name: 'par_rfa' })
  parRfa: string;
}
