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
  dateFinReference: string;
  emetteur: Emetteur;
}

export interface Emetteur {
  cdIntervenant: string;
  nomIntervenant: string;
  contact?: Contact;
}

export interface OuvrageDepollution {
  cdOuvrageDepollution: string;
  typeOuvrageDepollution: string;
  nomOuvrageDepollution: string;
  natureSystTraitementEauxUsees?: string;
  maitreOuvrage?: Intervenant;
  exploitant?: Intervenant;
  pointMesure: PointMesure[];
  typeRejet?: string;
  typeMilieuRejet?: string;
  zoneSensible?: string;
  masseEauRejet?: string;
  evenOuvragesAssainissement?: EvenOuvrageAssainissement[];
  valeurCaracteristiqueRejets?: ValeurCaracteristiqueRejet[];
}

export interface Intervenant {
  cdIntervenant: string;
}

export interface SystemeCollecte {
  cdSystemeCollecte: string;
  lbSystemeCollecte: string;
  pointMesure: PointMesure[];
  agglomerationAssainissement?: AgglomerationAssainissement;
  evenOuvragesAssainissement?: EvenOuvrageAssainissement[];
  valeurCaracteristiqueRejets?: ValeurCaracteristiqueRejet[];
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
  typeAppareilMesure?: string;
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

export interface Contact {
  typeContact?: string;
}

export interface AgglomerationAssainissement {
  cdAgglomerationAssainissement: string;
}

export interface EvenOuvrageAssainissement {
  typeEvenOuvrageAssainissement?: string;
}
