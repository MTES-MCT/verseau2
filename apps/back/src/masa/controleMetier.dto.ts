export interface ChargeEntranteMaxAndTranche {
  chargeMax: number;
  trancheLabel: string;
  trancheRfa: string;
}

/** CTL052 — Concentration moyenne annuelle N-1 pour un STEU et un paramètre donné */
export interface CmaResult {
  sandreCda: string;
  paramCode: string;
  value: number;
}

/** CTL053 — Débit max de référence (max(PC95, Dref)) pour un STEU donné */
export interface MaxDebitResult {
  sandreCda: string;
  maxDebit: number;
}

/** CTL054 — Charge entrante max et tranche d'obligation pour un STEU donné */
export interface ChargeEntranteResult {
  sandreCda: string;
  chargeMax: number;
  trancheLabel: string;
  trancheRfa: string;
}
