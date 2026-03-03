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

/** CTL054 — Comparaison charge entrante max année N vs N-1 pour un STEU donné */
export interface ChargeEntranteMaxComparison {
  sandreCda: string;
  chargeMaxN: number;
  chargeMaxNMoins1: number;
  trancheLabel: string;
  annee: number;
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

/** Résultat de résolution AG (agent) par email — utilisé pour l'authentification */
export interface AgByEmail {
  itvCdn: number;
  prCdn: number;
}

/** Intervenant résolu pour l'authentification et les droits de dépôt */
export interface IntervenantAuth {
  itvCdn: number;
  nom?: string;
  siret?: string;
}

/** Droits STEU/SCL par SIRET intervenant — utilisé pour la validation des droits de dépôt */
export interface VSteuSclItvResult {
  steuCda: string;
  sclCda: string;
  moItvRfa: string | null;
  satItvRfa: string | null;
  aeItvRfa: string | null;
}
