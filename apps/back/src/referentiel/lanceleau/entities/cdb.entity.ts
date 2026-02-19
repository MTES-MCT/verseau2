import { Column, Entity, PrimaryColumn } from 'typeorm';
import { trimTransformer } from '@database/trim.transformer';

@Entity('cdb', { schema: 'lanceleau', synchronize: false })
export class CdbEntity {
  @PrimaryColumn({ name: 'cdb_rfa', transformer: trimTransformer })
  cdbRfa: string;

  @Column({ name: 'cdb_nom_lb', transformer: trimTransformer })
  cdbNomLb: string;
}
