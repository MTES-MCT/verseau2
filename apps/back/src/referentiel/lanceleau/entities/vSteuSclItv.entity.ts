import { Entity, PrimaryColumn } from 'typeorm';

@Entity('v_steu_scl_itv', { schema: 'verseau', synchronize: false })
export class VSteuSclItvEntity {
  @PrimaryColumn({ name: 'steu_cda' })
  steuCda: string;

  @PrimaryColumn({ name: 'scl_cda' })
  sclCda: string;

  @PrimaryColumn({ name: 'mo_itv_rfa' })
  moItvRfa: string;
}
