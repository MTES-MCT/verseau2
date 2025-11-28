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
}

export interface OuvrageDepollution {
  cdOuvrageDepollution: string;
  typeOuvrageDepollution: string;
  nomOuvrageDepollution: string;
  pointMesure: PointMesure[];
}

export interface SystemeCollecte {
  cdSystemeCollecte: string;
  lbSystemeCollecte: string;
  pointMesure: PointMesure[];
}

export interface PointMesure {
  numeroPointMesure: string;
  prelevement: Prelevement[];
}

export interface Prelevement {
  analyse: Analyse[];
}

export interface Analyse {
  rsAnalyse: string;
}
