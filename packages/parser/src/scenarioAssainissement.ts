import { SandreScenarioCode, SandreScenarioVersion } from './sandreConstants';

export interface FctAssainissement {
  scenario: Scenario;
  ouvrages: OuvrageDepollution[];
  systemesCollecte: SystemeCollecte[];
}

export interface Scenario {
  codeScenario: SandreScenarioCode;
  versionScenario: SandreScenarioVersion;
  dateDebutReference: string;
  // Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
  // dateFinReference: string;
  emetteur: Emetteur;
}

export interface Emetteur {
  cdIntervenant: string;
  // Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
  // nomIntervenant: string;
  // contact?: Contact;
}

export interface OuvrageDepollution {
  cdOuvrageDepollution: string;
  typeOuvrageDepollution: string;
  // Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
  // nomOuvrageDepollution: string;
  natureSystTraitementEauxUsees?: string;
  maitreOuvrage?: Intervenant;
  exploitant?: Intervenant;
  pointMesure: PointMesure[];
  // Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
  // typeRejet?: string;
  // typeMilieuRejet?: string;
  // zoneSensible?: string;
  // masseEauRejet?: string;
  evenOuvragesAssainissement?: EvenOuvrageAssainissement[];
  valeurCaracteristiqueRejets?: ValeurCaracteristiqueRejet[];
}

export interface Intervenant {
  cdIntervenant: string;
}

export interface SystemeCollecte {
  cdSystemeCollecte: string;
  // Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
  // lbSystemeCollecte: string;
  pointMesure: PointMesure[];
  agglomerationAssainissement?: AgglomerationAssainissement;
  // Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
  // evenOuvragesAssainissement?: EvenOuvrageAssainissement[];
  // valeurCaracteristiqueRejets?: ValeurCaracteristiqueRejet[];
}

export interface ValeurCaracteristiqueRejet {
  destination: Destination;
  periodeCalcul: string;
}

export interface Destination {
  cdOuvrageAval: string;
  typeOuvrageAval?: string;
}

export interface PointMesure {
  numeroPointMesure: string;
  // Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
  // typeAppareilMesure?: string;
  locGlobalePointMesure?: string;
  prelevement: Prelevement[];
}

export interface Prelevement {
  cdSupport?: string;
  datePrlvt?: string;
  conformitePrlvt?: string;
  accrePrlvt?: string;
  analyse: Analyse[];
}

export interface Analyse {
  rsAnalyse: string;
  inSituAnalyse: string;
  statutRsAnalyse: string;
  qualRsAnalyse: string;
  cdFractionAnalysee?: string;
  cdMethode: string;
  cdParametre: string;
  cdUniteMesure: string;
  finalite: string;
  accreAna: string;
  cdRemAnalyse: string;
}

// Unused by controleV1 and controleMetierV2 services - commented out to reduce object size
// export interface Contact {
//   typeContact?: string;
// }

export interface AgglomerationAssainissement {
  cdAgglomerationAssainissement: string;
}

export interface EvenOuvrageAssainissement {
  typeEvenOuvrageAssainissement?: string;
}
