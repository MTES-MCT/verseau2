import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'mv_steu_scl_itv', schema: 'verseau', synchronize: false })
export class VSteuSclItvEntity {
  @ViewColumn({ name: 'steu_cda' })
  steuCda: string;

  @ViewColumn({ name: 'scl_cda' })
  sclCda: string;

  @ViewColumn({ name: 'mo_itv_rfa' })
  moItvRfa: string | null;

  @ViewColumn({ name: 'sat_itv_rfa' })
  satItvRfa: string | null;

  @ViewColumn({ name: 'ae_itv_rfa' })
  aeItvRfa: string | null;
}
