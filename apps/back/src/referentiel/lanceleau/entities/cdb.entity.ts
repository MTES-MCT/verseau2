import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('cdb', { schema: 'lanceleau', synchronize: false })
export class CdbEntity {
  @PrimaryColumn({ name: 'cdb_rfa' })
  cdbRfa: string;

  @Column({ name: 'cdb_nom_lb' })
  cdbNomLb: string;
}
