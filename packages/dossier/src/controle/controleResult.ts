import { ErrorCode, EvenementType } from './evenement';

export interface ControleError {
  code: ErrorCode; // e.g., "E2.003"
  params: string[]; // CdOuvrageDepollution value
  evenementType?: EvenementType;
}

export interface ControleErrorDto extends ControleError {
  message: string;
}

export interface PrelevementContext {
  cdOuvrageDepollution: string;
  numeroPointMesure: string;
  locGlobalePointMesure: string;
  datePrlvt: string;
  cdSupport: string;
}

export interface ControleIndividuel {
  success: boolean;
  name: ControleName;
  errors: ControleError[];
}

export enum ControleType {
  CONTROLE_V1 = 'CONTROLE_V1',
  CONTROLE_V2 = 'CONTROLE_V2',
}

export enum ControleName {
  CTL002 = 'CTL002',
  CTL003 = 'CTL003',
  CTL004 = 'CTL004',
  CTL005 = 'CTL005',
  CTL006 = 'CTL006',
  CTL007 = 'CTL007',
  CTL008 = 'CTL008',
  CTL009 = 'CTL009',
  CTL010 = 'CTL010',
  CTL011 = 'CTL011',
  CTL012 = 'CTL012',
  CTL013 = 'CTL013',
  CTL014 = 'CTL014',
  CTL015 = 'CTL015',
  CTL016 = 'CTL016',
  CTL017 = 'CTL017',
  CTL018 = 'CTL018',
  CTL019 = 'CTL019',
  CTL020 = 'CTL020',
  CTL021 = 'CTL021',
  CTL022 = 'CTL022',
  CTL023 = 'CTL023',
  CTL024 = 'CTL024',
  CTL025 = 'CTL025',
  CTL026 = 'CTL026',
  CTL034 = 'CTL034',
  CTL035 = 'CTL035',
  CTL036 = 'CTL036',
  CTL039 = 'CTL039',
  CTL040 = 'CTL040',
  CTL041 = 'CTL041',
  CTL042 = 'CTL042',
  CTL043 = 'CTL043',
  CTL044 = 'CTL044',
  CTL045 = 'CTL045',
  CTL046 = 'CTL046',
  CTL047 = 'CTL047',
  CTL048 = 'CTL048',
  CTL049 = 'CTL049',
  CTL050 = 'CTL050',
  CTL051 = 'CTL051',
  CTL052 = 'CTL052',
  CTL053 = 'CTL053',
  CTL054 = 'CTL054',
  CTL055 = 'CTL055',
  CTL056 = 'CTL056',
  CTL057 = 'CTL057',
  CTL058 = 'CTL058',
  CTL059 = 'CTL059',
  CTL060 = 'CTL060',
  CTL061 = 'CTL061',
  CTL201 = 'CTL201',
  CTL202 = 'CTL202',
  CTL_TECHNICAL_ERROR = 'CTL_TECHNICAL_ERROR',
}

export const ControleDescription: Record<ControleName, string> = {
  [ControleName.CTL002]: "Vérification que l'ouvrage de dépollution (STEU) existe bien en BdD",
  [ControleName.CTL003]: "Vérification que le maître d'ouvrage de l'ouvrage de dépollution (STEU) existe bien en BdD",
  [ControleName.CTL004]: "Vérification que l'exploitant de l'ouvrage de dépollution (STEU) existe bien en BdD",
  [ControleName.CTL005]: "Vérification de l'existence du point de mesure en BdD",
  [ControleName.CTL006]: "Vérification de l'existence du support en BdD",
  [ControleName.CTL007]: "Vérification de l'existence du lieu d'analyse en BdD",
  [ControleName.CTL008]: "Vérification de l'existence du statut de l'analyse en BdD",
  [ControleName.CTL009]: "Vérification de l'existence de la qualification de l'analyse en BdD",
  [ControleName.CTL010]: "Vérification de l'existence de la fraction analysée en BdD",
  [ControleName.CTL011]: "Vérification de l'existence de la méthode d'analyse en BdD",
  [ControleName.CTL012]: "Vérification de l'existence du paramètre en BdD",
  [ControleName.CTL013]: "Vérification de l'existence de l'unité du paramètre en BdD",
  [ControleName.CTL014]: "Vérification de l'existence de l'intervenant en BdD",
  [ControleName.CTL015]: "Vérification de l'existence de la finalité de l'analyse en BdD",
  [ControleName.CTL016]: "Vérification de l'existence de l'accréditation de l'analyse en BdD",
  [ControleName.CTL017]: "Vérification de l'existence de la période de calcul pour les destinations des boues en BdD",
  [ControleName.CTL018]: "Vérification de l'existence du type d'ouvrage aval pour les destinations des boues en BdD",
  [ControleName.CTL019]: "Vérification de l'existence de l'ouvrage aval (destinations des boues) en BdD",
  [ControleName.CTL020]: "Vérification de l'existence du type d'évènement en BdD",
  [ControleName.CTL021]: "Vérification de l'existence du code remarque en BdD",
  [ControleName.CTL022]: 'Vérification que système de collecte (SCL) existe bien en BdD',
  [ControleName.CTL023]: "Vérification que système de collecte (SCL) est rattaché à l'agglomération",
  [ControleName.CTL024]: "Vérification de l'existence du type d'ouvrage en BdD",
  [ControleName.CTL025]: "Vérification de l'existence de la nature du système de collecte en BdD",
  [ControleName.CTL026]: "Vérification de l'existence de l'intervenant émetteur en BdD",
  [ControleName.CTL034]: "Contrôle de l'existence et validité du point de mesure (Localisations A2-A8)",
  [ControleName.CTL035]: "Vérification de l'existence du code de conformité du prélèvement en BdD",
  [ControleName.CTL036]: "Vérification de l'existence du code d'accréditation du prélèvement en BdD",
  [ControleName.CTL039]:
    'Vérification que chaque groupe de valeurs est compris entre les bornes pour le ratio DCO/DBO5',
  [ControleName.CTL040]:
    'Vérification que chaque groupe de valeurs est compris entre les bornes pour le ratio MES/DBO5',
  [ControleName.CTL041]: 'Vérification des concentrations en DCO en dehors des gammes de valeurs attendues',
  [ControleName.CTL042]: 'Vérification des concentrations en DBO5 en dehors des gammes de valeurs attendues',
  [ControleName.CTL043]: 'Vérification des concentrations en MES en dehors des gammes de valeurs attendues',
  [ControleName.CTL044]: 'Vérification des concentrations en NTK en dehors des gammes de valeurs attendues',
  [ControleName.CTL045]: 'Vérification des concentrations en Ptot en dehors des gammes de valeurs attendues',
  [ControleName.CTL046]: 'Vérification des concentrations en pH en dehors des gammes de valeurs attendues',
  [ControleName.CTL047]: 'Vérification que la concentration DCO > DBO5',
  [ControleName.CTL048]: 'Vérification que la concentration NTK > N-NH4',
  [ControleName.CTL049]: 'Vérification que la concentration NGL > NTK',
  [ControleName.CTL050]: 'Vérification que la concentration Ptot > PO4',
  [ControleName.CTL051]: 'Vérification que les volumes A3/A4 sont cohérents avec la capacité nominale en EH',
  [ControleName.CTL052]: 'Comparaison des concentrations en DBO5/DCO (A3) avec les moyennes annuelles N-1',
  [ControleName.CTL053]: 'Vérification du débit entrant A3/A4/A7 vs 2 x max(PC95, Dref)',
  [ControleName.CTL054]:
    "Vérification d'un dépassement de plus de 20% de la charge entrante entre l'année N et l'année N-1",
  [ControleName.CTL055]: 'Vérification que la production de boue est non nulle et renseignée',
  [ControleName.CTL056]: 'Contrôle métier sur la température en sortie de station (point A4)',
  [ControleName.CTL057]: 'Contrôle sur la pluviométrie journalière au niveau du système de collecte (A1, R1)',
  [ControleName.CTL058]: 'Contrôle sur les volumes négatifs (Vol.Moy.J, Volume, Masse) sur tous les points de mesure',
  [ControleName.CTL059]: 'Contrôle sur les concentrations négatives ou nulles sur tous les points de mesure',
  [ControleName.CTL060]:
    'Contrôle sur la charge de pollution à traiter vs capacité nominale de la station (≥ 2 000 EH)',
  [ControleName.CTL061]: 'Vérification que les débits A3/A4 du paramètre 1552 sont renseignés à la même date',
  [ControleName.CTL201]: 'Vérification de la présence du paramètre AOF pour les analyses PFAS en sortie de station',
  [ControleName.CTL202]: 'Vérification de la présence du paramètre Fluorure pour les analyses PFAS aux points A3/A4',
  [ControleName.CTL_TECHNICAL_ERROR]: "Erreur technique lors de l'exécution des contrôles métiers",
};
