/** CTL052 — Concentration moyenne annuelle N-1 pour un STEU et un paramètre donné */
import {
  ConformiteSclDetailDto,
  ConformiteSclDto,
  ConformiteSclSortByValue,
  ConformiteSteuDetailDto,
  ConformiteSteuDto,
  ConformiteSteuSortByValue,
  EvenementSclDto,
  EvenementSclSortByValue,
  EvenementSteuDto,
  EvenementSteuSortByValue,
  MesuresSortByValue,
  OuvrageTypeValue,
  PaginationQuery,
  TrancheObligationRfa,
} from '@lib/dossier';

/** Filtres pour la recherche d'événements STEU */
export interface EvenementSteuFilters extends PaginationQuery {
  steuCdns: number[];
  year: number;
  typeEvenementCode?: string;
  sortBy?: EvenementSteuSortByValue;
}

/** Filtres pour la recherche d'événements SCL */
export interface EvenementSclFilters extends PaginationQuery {
  sclCdns: number[];
  year: number;
  typeEvenementCode?: string;
  pointMesureIdentifiant?: number;
  sortBy?: EvenementSclSortByValue;
}

/** Une ligne d'événement STEU */
export type EvenementSteuRow = EvenementSteuDto;

/** Une ligne d'événement SCL */
export type EvenementSclRow = EvenementSclDto;

export type MasaConformiteSteuSortByValue = ConformiteSteuSortByValue | 'conformiteNationaleProvisoire';
export type MasaConformiteSclSortByValue = ConformiteSclSortByValue | 'conformiteNationaleTempsPluieProvisoire';

export interface CmaBySandreCdaAndParam {
  ouvrageDepollutionCode: string;
  parametreAnalyseCode: string;
  resultatAnnuelConcentrationMoyenne: number;
}

/** CTL051 / CTL060 — Capacité nominale en EH pour un STEU donné et une année */
export interface CapaciteNominaleBySandreCda {
  ouvrageDepollutionCode: string;
  ouvrageDepollutionCapaciteNominaleEH: number;
}

/** CTL053 — Débit max de référence (max(PC95, Dref)) pour un STEU donné */
export interface MaxDebitBySandreCda {
  ouvrageDepollutionCode: string;
  ouvrageDepollutionDebitMaximalReference: number;
}

/** CTL055 — Production de boue nulle ou absente pour un STEU donné */
export interface ProductionBoueZero {
  ouvrageDepollutionCode: string;
  boueProductionAnnee: number;
  boueProductionAnnuelle: number;
}

/** CTL054 — Comparaison charge entrante max année N vs N-1 pour un STEU donné */
export interface ChargeEntranteMaxComparison {
  ouvrageDepollutionCode: string;
  chargeEntranteMaximaleEHN: number;
  chargeEntranteMaximaleEHNMoins1: number;
  trancheObligationLibelle: string;
  bilanReferenceAnnee: number;
}

/** Résultat STEU retourné par un fetch batch MASA */
export interface SteuCdnBySandreCda {
  ouvrageDepollutionCode: string;
  ouvrageDepollutionIdentifiant: number;
}

/** STEU avec nom — utilisé pour les dropdowns et listes d'ouvrages */
export interface SteuWithName {
  ouvrageDepollutionCode: string;
  ouvrageDepollutionNom: string | null;
}

/** SCL avec nom — utilisé pour le dropdown système de collecte */
export interface SclWithName {
  systemeCollecteCode: string;
  systemeCollecteNom: string | null;
}

/** Résultat SCL retourné par un fetch batch MASA */
export interface SclCdnBySandreCda {
  systemeCollecteCode: string;
  systemeCollecteIdentifiant: number;
}

/** Résultat ITV retourné par un fetch batch MASA */

export interface ItvCdnByRfa {
  intervenantSiret: string;
  intervenantIdentifiant: number;
}

/** Résultat de résolution AG (agent) par email — utilisé pour l'authentification */
export interface AgByEmail {
  intervenantIdentifiant: number;
  principalIdentifiant: number;
}

/** Intervenant résolu pour l'authentification et les droits de dépôt */
export interface IntervenantAuth {
  intervenantIdentifiant: number;
  intervenantNom?: string;
  intervenantSiret?: string; // siret
}

/** Droits STEU/SCL par SIRET intervenant — utilisé pour la validation des droits de dépôt */
export interface VSteuSclItvResult {
  ouvrageDepollutionCode: string;
  systemeCollecteCode: string;
  maitreOuvrageSiret: string | null;
  prestataireAutosurveillanceSiret: string | null;
  agenceEauSiret: string | null;
}

/** Point de mesure (PMO) — utilisé pour le dropdown de sélection */
export interface PointMesure {
  pointMesureIdentifiant: number;
  pointMesureNumero: string;
  pointMesureLibelle: string | null;
}

/** Paramètre — utilisé pour le dropdown de sélection */
export interface ParametreMesure {
  parametreAnalyseCode: string;
  parametreNomCourt: string | null;
}

/** Élément de nomenclature (ex: finalité, statut) — utilisé pour les dropdowns de sélection */
export interface NomenclatureItem {
  elementNomenclatureCode: string;
  elementNomenclatureLibelle: string | null;
}

/** Point de mesure du référentiel — utilisé pour la page référentiel */
export interface PointMesureReferentielRow {
  ouvrageDepollutionCode: string;
  ouvrageDepollutionNom: string | null;
  pointAgenceEauNumero: string | null;
  pointMesureNumero: string | null;
  pointMesureLibelle: string | null;
  pointMesureLocalisationCode: string | null;
  pointMesureLocalisationLibelle: string | null;
  pointMesureSclCategorie: string | null;
  pointMesureValiditeDebutDate: string | null;
  pointMesureValiditeFinDate: string | null;
}

/** Filtres pour la recherche de conformité STEU */
export interface ConformiteSteuFilters extends PaginationQuery {
  steuCdns: number[];
  year: number;
  trancheObligationRfa?: TrancheObligationRfa;
  impact?: 'avec' | 'sans';
  sortBy?: MasaConformiteSteuSortByValue;
}

/** Filtres pour la recherche de conformité SCL */
export interface ConformiteSclFilters extends PaginationQuery {
  steuCdns: number[];
  year: number;
  trancheObligationRfa?: TrancheObligationRfa;
  impact?: 'avec' | 'sans';
  sortBy?: MasaConformiteSclSortByValue;
}

/** Une ligne brute de conformité STEU */
export interface ConformiteSteuRow extends ConformiteSteuDto {
  conformiteNationaleProvisoire: string | null;
}

/** Une ligne brute de conformité SCL */
export interface ConformiteSclRow extends ConformiteSclDto {
  conformiteNationaleTempsPluieProvisoire: string | null;
}

/** Le détail brut de conformité STEU */
export interface ConformiteSteuDetailRow extends ConformiteSteuDetailDto {
  conformiteNationaleParametresConformesPeriodeNb: number | null;
  conformiteNationaleParametresConformesAnneeNb: number | null;
  conformiteNationaleParametresNonConformesPeriodeNb: number | null;
  conformiteNationaleParametresNonConformesAnneeNb: number | null;
  conformiteNationaleRedhibitoiresPeriodeNb: number | null;
  conformiteNationaleRedhibitoiresAnneeNb: number | null;
  conformiteNationaleParametresConformesPeriodeLb: string | null;
  conformiteNationaleParametresConformesAnneeLb: string | null;
  conformiteNationaleParametresNonConformesPeriodeLb: string | null;
  conformiteNationaleParametresNonConformesAnneeLb: string | null;
  conformiteNationaleRedhibitoiresPeriodeLb: string | null;
  conformiteNationaleRedhibitoiresAnneeLb: string | null;
}

/** Le détail brut de conformité SCL */
export type ConformiteSclDetailRow = ConformiteSclDetailDto;

/** Filtres pour la recherche de mesures */
export interface MesureFilters extends PaginationQuery {
  ouvrageType: OuvrageTypeValue;
  steuSandreCdas: string[];
  sclSandreCdas: string[];
  pointMesureIdentifiant?: number;
  dateDebut?: string;
  dateFin?: string;
  parametreAnalyseCode?: string;
  resultatAnalyseQualification?: string;
  resultatAnalyseStatut?: string;
  analyseFinalite?: string;
  sortBy?: MesuresSortByValue;
}

/** Une mesure avec tous ses champs joints */
export interface MesureRow {
  ouvrageDepollutionCode: string;
  ouvrageDepollutionNom: string | null;
  systemeCollecteCode: string | null;
  systemeCollecteNom: string | null;
  pointMesureLocalisationCode: string | null;
  pointAgenceEauNumero: string | null;
  pointMesureNumero: string | null;
  pointMesureLibelle: string | null;
  prelevementDate: Date | null;
  parametreAnalyseCode: string;
  parametreNomCourt: string | null;
  resultatAnalyseValeur: number | null;
  uniteMesureSymbole: string | null;
  analyseFinalite: string | null;
  resultatAnalyseStatut: string | null;
  resultatAnalyseQualification: string | null;
}
