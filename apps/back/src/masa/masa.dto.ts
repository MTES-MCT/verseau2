import {
  PaginationQuery,
  MesuresSortByValue,
  OuvrageTypeValue,
  ConformiteSteuSortByValue,
  ConformiteSclSortByValue,
} from '@lib/dossier';

export interface ConformiteSteuFilters extends PaginationQuery {
  steuCdns: number[];
  trancheObligationLibelle?: string;
  impact?: 'avec' | 'sans';
  sortBy?: ConformiteSteuSortByValue;
}

export interface ConformiteSclFilters extends PaginationQuery {
  steuCdns: number[];
  trancheObligationLibelle?: string;
  impact?: 'avec' | 'sans';
  sortBy?: ConformiteSclSortByValue;
}

export interface ConformiteSteuRow {
  ouvrageDepollutionCode: string;
  ouvrageDepollutionNom: string | null;
  trancheObligationLibelle: string | null;
  capaciteNominaleEH: number | null;
  suiviDebutDate: string | null;
  suiviFinDate: string | null;
  conformiteNationaleProvisoire: string | null;
  conformiteLocaleProvisoire: string | null;
  impactConformite: boolean;
  suiviRegulierEffectue: boolean | null;
  suiviRegulierDate: string | null;
}

export interface ConformiteSclRow {
  systemeCollecteCode: string;
  systemeCollecteNom: string | null;
  trancheObligationLibelle: string | null;
  typeScl: string | null;
  suiviDebutDate: string | null;
  suiviFinDate: string | null;
  conformiteLocaleTempsPluieProvisoire: string | null;
  conformiteNationaleTempsPluieProvisoire: string | null;
  impactConformite: boolean;
  suiviRegulierEffectue: boolean | null;
  suiviRegulierDate: string | null;
}

export interface ConformiteSteuDetailRow {
  conformiteLocaleParametresConformesPeriodeNb: number | null;
  conformiteLocaleParametresConformesAnneeNb: number | null;
  nonConformiteLocaleParametresConformesPeriodeNb: number | null;
  nonConformiteLocaleParametresConformesAnneeNb: number | null;
  redhLocaleParametresConformesPeriodeNb: number | null;
  redhLocaleParametresConformesAnneeNb: number | null;
  conformiteLocaleParametresConformesPeriodeLibelle: string | null;
  conformiteLocaleParametresConformesAnneeLibelle: string | null;
  nonConformiteLocaleParametresConformesPeriodeLibelle: string | null;
  nonConformiteLocaleParametresConformesAnneeLibelle: string | null;
  redhLocaleParametresConformesPeriodeLibelle: string | null;
  redhLocaleParametresConformesAnneeLibelle: string | null;
  conformiteNationaleParametresConformesPeriodeNb: number | null;
  conformiteNationaleParametresConformesAnneeNb: number | null;
  nonConformiteNationaleParametresConformesPeriodeNb: number | null;
  nonConformiteNationaleParametresConformesAnneeNb: number | null;
  redhNationaleParametresConformesPeriodeNb: number | null;
  redhNationaleParametresConformesAnneeNb: number | null;
  conformiteNationaleParametresConformesPeriodeLibelle: string | null;
  conformiteNationaleParametresConformesAnneeLibelle: string | null;
  nonConformiteNationaleParametresConformesPeriodeLibelle: string | null;
  nonConformiteNationaleParametresConformesAnneeLibelle: string | null;
  redhNationaleParametresConformesPeriodeLibelle: string | null;
  redhNationaleParametresConformesAnneeLibelle: string | null;
  hcnfPeriodeNb: number | null;
  hcnfAnneeNb: number | null;
  hctsPeriodeNb: number | null;
  hctsAnneeNb: number | null;
  hcnfPeriodeLibelle: string | null;
  hcnfAnneeLibelle: string | null;
  hctsPeriodeLibelle: string | null;
  hctsAnneeLibelle: string | null;
  evtPeriodeNb: number | null;
  evtAnneeNb: number | null;
}

export interface ConformiteSclDetailRow {
  volumeDeversePeriodePc: number | null;
  volumeDeverseAnneePc: number | null;
  conformiteVolumePeriode: number | null;
  conformiteVolumeAnnee: number | null;
  fluxDeversePeriodePc: number | null;
  fluxDeverseAnneePc: number | null;
  conformiteFluxPeriode: number | null;
  conformiteFluxAnnee: number | null;
  joursDeversementPeriodeNb: number | null;
  joursDeversementAnneeNb: number | null;
  conformiteJoursDeversementPeriode: number | null;
  conformiteJoursDeversementAnnee: number | null;
}

/** CTL052 — Concentration moyenne annuelle N-1 pour un STEU et un paramètre donné */

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
