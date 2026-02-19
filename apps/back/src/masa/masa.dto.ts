/** CTL052 — Concentration moyenne annuelle N-1 pour un STEU et un paramètre donné */
export interface CmaBySandreCdaAndParam {
  sandreCda: string;
  paramCode: string;
  value: number;
}

/** CTL053 — Débit max de référence (max(PC95, Dref)) pour un STEU donné */
export interface MaxDebitBySandreCda {
  sandreCda: string;
  maxDebit: number;
}

/** CTL054 — Charge entrante max et tranche d'obligation pour un STEU donné */
export interface ChargeEntranteAndTrancheBySandreCda {
  sandreCda: string;
  chargeMax: number;
  trancheLabel: string;
  trancheRfa: string;
}

/** Résultat STEU retourné par un fetch batch MASA */
export interface SteuCdnBySandreCda {
  sandreCda: string;
  steuCdn: number;
}
/** Résultat ITV retourné par un fetch batch MASA */

export interface ItvCdnByRfa {
  rfa: string;
  itvCdn: number;
}
