/** CTL052 — Concentration moyenne annuelle N-1 pour un STEU et un paramètre donné */
import { PaginationQuery, MesuresSortByValue, OuvrageTypeValue } from '@lib/dossier';

export interface CmaBySandreCdaAndParam {
  codeOuvrageDepollution: string;
  codeParametreAnalyse: string;
  concentrationMoyenneAnnuelle: number;
}

/** CTL051 / CTL060 — Capacité nominale en EH pour un STEU donné et une année */
export interface CapaciteNominaleBySandreCda {
  codeOuvrageDepollution: string;
  capaciteNominaleEquivalentHabitants: number;
}

/** CTL053 — Débit max de référence (max(PC95, Dref)) pour un STEU donné */
export interface MaxDebitBySandreCda {
  codeOuvrageDepollution: string;
  debitMaximalReference: number;
}

/** CTL055 — Production de boue nulle ou absente pour un STEU donné */
export interface ProductionBoueZero {
  codeOuvrageDepollution: string;
  anneeProductionBoue: number;
  productionBoueAnnuelle: number;
}

/** CTL054 — Comparaison charge entrante max année N vs N-1 pour un STEU donné */
export interface ChargeEntranteMaxComparison {
  codeOuvrageDepollution: string;
  chargeEntranteMaximaleAnneeN: number;
  chargeEntranteMaximaleAnneeNMoins1: number;
  libelleTrancheObligation: string;
  anneeReferenceBilan: number;
}

/** Résultat STEU retourné par un fetch batch MASA */
export interface SteuCdnBySandreCda {
  codeOuvrageDepollution: string;
  identifiantOuvrageDepollution: number;
}

/** STEU avec nom — utilisé pour les dropdowns et listes d'ouvrages */
export interface SteuWithName {
  codeOuvrageDepollution: string;
  nomOuvrageDepollution: string | null;
}

/** SCL avec nom — utilisé pour le dropdown système de collecte */
export interface SclWithName {
  codeSystemeCollecte: string;
  nomSystemeCollecte: string | null;
}

/** Résultat ITV retourné par un fetch batch MASA */

export interface ItvCdnByRfa {
  siretIntervenant: string;
  identifiantIntervenant: number;
}

/** Résultat de résolution AG (agent) par email — utilisé pour l'authentification */
export interface AgByEmail {
  identifiantIntervenant: number;
  identifiantPrincipal: number;
}

/** Intervenant résolu pour l'authentification et les droits de dépôt */
export interface IntervenantAuth {
  identifiantIntervenant: number;
  nomIntervenant?: string;
  siretIntervenant?: string; // siret
}

/** Droits STEU/SCL par SIRET intervenant — utilisé pour la validation des droits de dépôt */
export interface VSteuSclItvResult {
  codeOuvrageDepollution: string;
  codeSystemeCollecte: string;
  siretMaitreOuvrage: string | null;
  siretPrestataireAutosurveillance: string | null;
  siretAgenceEau: string | null;
}

/** Point de mesure (PMO) — utilisé pour le dropdown de sélection */
export interface PointMesure {
  identifiantPointMesure: number;
  numeroPointMesure: string;
  libellePointMesure: string | null;
}

/** Paramètre — utilisé pour le dropdown de sélection */
export interface ParametreMesure {
  codeParametreAnalyse: string;
  nomCourtParametre: string | null;
}

/** Élément de nomenclature (ex: finalité, statut) — utilisé pour les dropdowns de sélection */
export interface NomenclatureItem {
  codeElementNomenclature: string;
  libelleElementNomenclature: string | null;
}

/** Point de mesure du référentiel — utilisé pour la page référentiel */
export interface PointMesureReferentielRow {
  codeOuvrageDepollution: string;
  nomOuvrageDepollution: string | null;
  numeroPointAgenceEau: string | null;
  numeroPointMesure: string | null;
  libellePointMesure: string | null;
  codeLocalisationPointMesure: string | null;
  libelleLocalisationPointMesure: string | null;
  categoriePointMesureScl: string | null;
  dateDebutValiditePointMesure: string | null;
  dateFinValiditePointMesure: string | null;
}

/** Filtres pour la recherche de mesures */
export interface MesureFilters extends PaginationQuery {
  ouvrageType: OuvrageTypeValue;
  steuSandreCdas: string[];
  sclSandreCdas: string[];
  identifiantPointMesure?: number;
  dateDebut?: string;
  dateFin?: string;
  codeParametreAnalyse?: string;
  qualificationResultatAnalyse?: string;
  statutResultatAnalyse?: string;
  finaliteAnalyse?: string;
  sortBy?: MesuresSortByValue;
}

/** Une mesure avec tous ses champs joints */
export interface MesureRow {
  codeOuvrageDepollution: string;
  nomOuvrageDepollution: string | null;
  codeSystemeCollecte: string | null;
  nomSystemeCollecte: string | null;
  codeLocalisationPointMesure: string | null;
  numeroPointAgenceEau: string | null;
  numeroPointMesure: string | null;
  libellePointMesure: string | null;
  datePrelevement: Date | null;
  codeParametreAnalyse: string;
  nomCourtParametre: string | null;
  valeurResultatAnalyse: number | null;
  symboleUniteMesure: string | null;
  finaliteAnalyse: string | null;
  statutResultatAnalyse: string | null;
  qualificationResultatAnalyse: string | null;
}
