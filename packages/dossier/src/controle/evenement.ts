export enum ErrorCode {
  E2_003 = 'E2.003',
  E2_004 = 'E2.004',
  E2_005 = 'E2.005',
  E2_006 = 'E2.006',
  E2_007 = 'E2.007',
  E2_008 = 'E2.008',
  E2_009 = 'E2.009',
  E2_010 = 'E2.010',
  E2_011 = 'E2.011',
  E2_012 = 'E2.012',
  E2_013 = 'E2.013',
  E2_014 = 'E2.014',
  E2_015 = 'E2.015',
  E2_016 = 'E2.016',
  E2_017 = 'E2.017',
  E2_018 = 'E2.018',
  E2_019 = 'E2.019',
  E2_020 = 'E2.020',
  E2_021 = 'E2.021',
  E2_022 = 'E2.022',
  E2_023 = 'E2.023',
  E2_024 = 'E2.024',
  E2_025 = 'E2.025',
  E2_026 = 'E2.026',
  E2_033 = 'E2.033',
  E2_034 = 'E2.034',
  E2_035 = 'E2.035',
  E2_036 = 'E2.036',
  E2_039 = 'E2.039',
  E2_040 = 'E2.040',
  E2_041 = 'E2.041',
  E2_042 = 'E2.042',
  E2_043 = 'E2.043',
  E2_044 = 'E2.044',
  E2_045 = 'E2.045',
  E2_046 = 'E2.046',
  E2_047 = 'E2.047',
  E2_048 = 'E2.048',
  E2_049 = 'E2.049',
  E2_050 = 'E2.050',
  E2_051 = 'E2.051',
  E2_052 = 'E2.052',
  E2_053 = 'E2.053',
  E2_054 = 'E2.054',
  E2_055 = 'E2.055',
  E2_999 = 'E2.999',
}

export type ErrorParamsMap = {
  [ErrorCode.E2_003]: [cdOuvrage: string];
  [ErrorCode.E2_004]: [moa: string, cdOuvrage: string] | [moa: string];
  [ErrorCode.E2_005]: [exploitant: string, cdOuvrage: string] | [exploitant: string];
  [ErrorCode.E2_006]: [cdSupport: string];
  [ErrorCode.E2_007]: [cdLieuAnalyse: string];
  [ErrorCode.E2_008]: [cdStatut: string];
  [ErrorCode.E2_009]: [cdQualification: string];
  [ErrorCode.E2_010]: [cdFraction: string];
  [ErrorCode.E2_011]: [cdMethode: string];
  [ErrorCode.E2_012]: [cdParametre: string];
  [ErrorCode.E2_013]: [cdUnite: string];
  [ErrorCode.E2_014]: [cdIntervenant: string];
  [ErrorCode.E2_015]: [cdFinalite: string];
  [ErrorCode.E2_016]: [cdAccreditation: string];
  [ErrorCode.E2_017]: [cdPeriode: string];
  [ErrorCode.E2_018]: [cdTypeOuvrageAval: string];
  [ErrorCode.E2_019]: [cdOuvrageAval: string];
  [ErrorCode.E2_020]: [cdTypeEvenement: string];
  [ErrorCode.E2_021]: [cdRemarque: string];
  [ErrorCode.E2_022]: [cdScl: string];
  [ErrorCode.E2_023]: [cdAgglo: string, cdScl: string];
  [ErrorCode.E2_024]: [cdTypeOuvrageDepollution: string];
  [ErrorCode.E2_025]: [cdNatureSteu: string];
  [ErrorCode.E2_026]: [cdEmetteur: string];
  [ErrorCode.E2_033]: [numeroPointMesure: string, cdOuvrage: string];
  [ErrorCode.E2_034]: [cdTypeDeversoir: string];
  [ErrorCode.E2_035]: [cdConformite: string];
  [ErrorCode.E2_036]: [cdTypeAppareil: string];
  [ErrorCode.E2_039]: [
    cdOuvrage: string,
    locGlobale: string,
    date: string,
    cdSupport: string,
    val1: string,
    val2: string,
    ratio: string,
  ];
  [ErrorCode.E2_040]: [
    cdOuvrage: string,
    locGlobale: string,
    date: string,
    cdSupport: string,
    val1: string,
    val2: string,
    ratio: string,
  ];
  [ErrorCode.E2_041]: [cdOuvrage: string, locGlobale: string, date: string, cdSupport: string, val: string];
  [ErrorCode.E2_042]: [cdOuvrage: string, locGlobale: string, date: string, cdSupport: string, val: string];
  [ErrorCode.E2_043]: [cdOuvrage: string, locGlobale: string, date: string, cdSupport: string, val: string];
  [ErrorCode.E2_044]: [cdOuvrage: string, locGlobale: string, date: string, cdSupport: string, val: string];
  [ErrorCode.E2_045]: [cdOuvrage: string, locGlobale: string, date: string, cdSupport: string, val: string];
  [ErrorCode.E2_046]: [cdOuvrage: string, locGlobale: string, date: string, cdSupport: string, val: string];
  [ErrorCode.E2_047]: [
    cdOuvrage: string,
    locGlobale: string,
    date: string,
    cdSupport: string,
    val1: string,
    val2: string,
  ];
  [ErrorCode.E2_048]: [
    cdOuvrage: string,
    locGlobale: string,
    date: string,
    cdSupport: string,
    val1: string,
    val2: string,
  ];
  [ErrorCode.E2_049]: [
    cdOuvrage: string,
    locGlobale: string,
    date: string,
    cdSupport: string,
    val1: string,
    val2: string,
  ];
  [ErrorCode.E2_050]: [
    cdOuvrage: string,
    locGlobale: string,
    date: string,
    cdSupport: string,
    val1: string,
    val2: string,
  ];
  [ErrorCode.E2_051]:
    | [cdOuvrage: string, date: string, seuil: string, valA3: string, testA3: string, valA4: string, testA4: string]
    | [date: string];
  [ErrorCode.E2_052]: [param: string, cdOuvrage: string, date: string, val: string, cma: string] | [date: string];
  [ErrorCode.E2_053]: [cdOuvrage: string, date: string, total: string, maxRef: string, threshold: string];
  [ErrorCode.E2_054]: [
    cdOuvrage: string,
    chargeMaxN: string,
    chargeMaxNMoins1: string,
    trancheLabel: string,
    variationPct: string,
  ];
  [ErrorCode.E2_055]: [cdOuvrage: string, annee: string, productionBoue: string];
  [ErrorCode.E2_999]: [message: string];
};

export enum AvertissmentCode {
  A2_001 = 'A2.001',
  A2_002 = 'A2.002',
}

export enum EvenementType {
  ERREUR = 'ERREUR',
  AVERTISSEMENT = 'AVERTISSEMENT',
}
