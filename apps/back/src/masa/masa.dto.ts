/** CTL052 — Concentration moyenne annuelle N-1 pour un STEU et un paramètre donné */
import { PaginationQuery, MesuresSortByValue, OuvrageTypeValue } from '@lib/dossier';

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

/** CTL055 — Production de boue nulle ou absente pour un STEU donné */
export interface ProductionBoueZero {
  sandreCda: string;
  annee: number;
  productionBoue: number;
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

/** STEU avec nom — utilisé pour les dropdowns et listes d'ouvrages */
export interface SteuWithName {
  steuSandreCda: string;
  steuNom: string | null;
}

/** SCL avec nom — utilisé pour le dropdown système de collecte */
export interface SclWithName {
  sclSandreCda: string;
  sclNom: string | null;
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
  itvNomLb?: string;
  itvRfa?: string; // siret
}

/** Droits STEU/SCL par SIRET intervenant — utilisé pour la validation des droits de dépôt */
export interface VSteuSclItvResult {
  steuCda: string;
  sclCda: string;
  moItvRfa: string | null;
  satItvRfa: string | null;
  aeItvRfa: string | null;
}

/** Point de mesure (PMO) — utilisé pour le dropdown de sélection */
export interface PointMesure {
  pmoCdn: number;
  pmoNo: string;
  pmoLb: string | null;
}

/** Paramètre — utilisé pour le dropdown de sélection */
export interface ParametreMesure {
  parRfa: string;
  parCourtNomLb: string | null;
}

/** Élément de nomenclature (ex: finalité, statut) — utilisé pour les dropdowns de sélection */
export interface NomenclatureItem {
  code: string;
  label: string | null;
}

/** Filtres pour la recherche de mesures */
export interface MesureFilters extends PaginationQuery {
  ouvrageType: OuvrageTypeValue;
  steuSandreCdas: string[];
  sclSandreCdas: string[];
  pmoCdn?: number;
  dateDebut?: string;
  dateFin?: string;
  parametreCode?: string;
  qualification?: string;
  statut?: string;
  finalite?: string;
  sortBy?: MesuresSortByValue;
}

/** Une mesure avec tous ses champs joints */
export interface MesureRow {
  steuSandreCda: string;
  steuNom: string | null;
  sclSandreCda: string | null;
  sclNom: string | null;
  localisationPoint: string | null;
  numPointAgence: string | null;
  numPoint: string | null;
  nomPoint: string | null;
  date: Date | null;
  parametreCode: string;
  parametreNom: string | null;
  valeur: number | null;
  unite: string | null;
  finalite: string | null;
  statut: string | null;
  qualification: string | null;
}
