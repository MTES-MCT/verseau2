export interface FctAssainissement {
  scenario: Scenario;
  ouvrages: OuvrageDepollution[];
  systemesCollecte: SystemeCollecte[];
}

export interface Scenario {
  codeScenario: string;
  versionScenario: string;
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
  maitreOuvrage?: Intervenant;
  exploitant?: Intervenant;
  pointMesure: PointMesure[];
  boues?: Boues[];
  evenements?: Evenement[];
  typeRejet?: string;
  typeMilieuRejet?: string;
  zoneSensible?: string;
  masseEauRejet?: string;
}

export interface Intervenant {
  cdIntervenant: string;
}

export interface SystemeCollecte {
  cdSystemeCollecte: string;
  lbSystemeCollecte: string;
  typeReseau?: string;
  typeSystemeCollecte?: string;
  typePompeRelave?: string;
  typeDeversoirOrage?: string;
  typeBassinOrage?: string;
  pointMesure: PointMesure[];
}

export interface PointMesure {
  numeroPointMesure: string;
  typeAppareilMesure?: string;
  prelevement: Prelevement[];
}

export interface Prelevement {
  cdSupport?: string;
  analyse: Analyse[];
}

export interface Analyse {
  rsAnalyse: string;
  inSituAnalyse?: string;
  statutRsAnalyse?: string;
  qualRsAnalyse?: string;
  cdFractionAnalysee?: string;
  cdMethode?: string;
  cdParametre?: string;
  cdUniteMesure?: string;
  finalite?: string;
  accreAna?: string;
  cdRemarque?: string;
}

export interface Boues {
  periodeCalcul?: string;
  typeOuvrageAval?: string;
  cdOuvrageAval?: string;
  typeFiliereBoues?: string;
  destinationBoues?: string;
  typeTraitementBoues?: string;
  uniteFiliereBoues?: string;
}

export interface Evenement {
  typeEvenement?: string;
}

export interface Contact {
  typeContact?: string;
}
