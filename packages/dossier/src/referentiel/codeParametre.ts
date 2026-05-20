export enum CodeParametre {
  /** Demande Chimique en Oxygene (DCO) */
  DCO = 1314,
  /** Demande Biologique en Oxygene sous 5 jours (DBO5) */
  DBO5 = 1313,
  /** Matieres en suspensions (MES) */
  MES = 1305,
  /** Azote Kjeldal (NTK) */
  NTK = 1319,
  /** Phosphore total (Ptot) */
  Ptot = 1350,
  /** Azote ammoniacal (Code 1335) */
  N_NH4 = 1335,
  /** Azote Global (NGL) */
  NGL = 1551,
  /** Potentiel Hydrogene (pH) */
  pH = 1302,
  /** Orthophosphates (PO4) */
  PO4 = 1433,
  /** Volume moyen journalier (m3/j) */
  Volume = 1552,
  /** Temperature (degC) */
  Temperature = 1301,
  /** Pluviometrie journaliere (mm) */
  Pluviometrie = 1553,
  /** Volume (m3) */
  VolumeRef = 1098,
  /** Masse (kg) */
  Masse = 1099,
  /** Nitrites (NO2) */
  NO2 = 1339,
  /** Nitrates (NO3) */
  NO3 = 1340,
  /** Matieres Seches a 105C (MS105) */
  MS105 = 1307,
}

export enum CodeUniteMesure {
  // mg(N)/L
  MG_N_L = 168,

  // mg/L
  MG_L = 162,
}
