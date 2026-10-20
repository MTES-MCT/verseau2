import { SandreAcceptationStatus } from '@lib/dossier';

export interface SandreUploadParams {
  /** One XML document; ZIP/multiple tasks are deliberately unsupported. */
  xml: Buffer;
}

export interface SandreTaskReference {
  sessionId: string;
  taskId: string;
}

export type SandrePollJob = { depotId: string; attemptCount: number } & (SandreTaskReference | { jeton: string });

export interface SandreError {
  /** Error code */
  code?: string;
  /** Error message */
  message?: string;
  /** Error location/line */
  location?: string;
  /** Raw error XML content */
  raw?: string;
}

export interface SandreIntervenantAttributes {
  schemeAgencyID: string;
}

export interface SandreService {
  NomService: string;
}

export interface SandreContact {
  NomContact: string;
  PrenomContact: string;
  MelContact: string;
}

export interface SandreSI {
  NomSI: string;
  VersionSI: string;
  AdresseIP: string;
}

export interface SandreIntervenant {
  'CdIntervenant@attributes': SandreIntervenantAttributes;
  CdIntervenant: string;
  NomIntervenant: string;
  Service: SandreService;
  Contact: SandreContact;
  SI: SandreSI;
}

export interface SandreScenario {
  CodeScenario: string;
  VersionScenario: string;
  NomScenario: string;
  DateCreationFichier: string;
  ReferenceFichierEnvoi: string;
  Emetteur: SandreIntervenant;
  Destinataire: SandreIntervenant;
}

export interface SandreErreurAttributes {
  SeveriteErreur: string;
}

export interface SandreErreur {
  '@attributes'?: SandreErreurAttributes;
  CdErreur: string;
  LocationErreur?: string;
  DescriptifErreur: string;
  LigneErreur?: string;
  ColonneErreur?: string;
}

export interface SandreNestedErreur {
  'Erreur@attributes'?: SandreErreurAttributes;
  Erreur: SandreErreur;
}

export interface SandreErreurAttributesWrapper {
  SeveriteErreur: string;
}

export interface SandreReferentiel {
  CdReferentiel: string;
  NomReferentiel: string;
  DateMAJReferentiel: string;
}

export interface SandreAccuseReception {
  Acceptation: string;
  CodeScenario: string;
  VersionScenario: string;
  NomScenario: string;
  DateCreationFichier: string;
  ReferenceFichierEnvoi: string;
  CleSecuFichierEnvoi: string;
  'Erreur@attributes'?: SandreErreurAttributesWrapper;
  Erreur?: SandreErreur | (SandreErreur | SandreNestedErreur)[];
  Jeton: string;
  TailleFichier: string;
  DateMAJSchemaXML: string;
  DateMAJSchematronReferentiel: string;
  DateMAJSchematronReglesMetier: string;
  Referentiel?: SandreReferentiel[];
  TempsEtape0: string;
  TempsEtape1: string;
  TempsEtape2: string;
  TempsEtape3: string;
  TempsEtape4: string;
  TempsEtape5: string;
}

export interface SandreAcquittement {
  Scenario: SandreScenario;
  AccuseReception: SandreAccuseReception;
}

export interface SandreValidationResult {
  ACQ: SandreAcquittement;
}

export interface SandreValidationError {
  code: string;
  message: string;
  location?: string;
  ligne?: string;
  colonne?: string;
  severite?: string;
}

export interface SandreValidationSummary {
  /** Whether the file is conformant */
  isConformant: boolean;
  /** The acceptance status */
  acceptationStatus: SandreAcceptationStatus;
  /** The token/jeton from the validation */
  jeton: string;
  /** The scenario code */
  codeScenario: string;
  /** The scenario version */
  versionScenario: string;
  /** Error information if validation failed */
  error?: SandreValidationError;
  /** List of errors if validation failed */
  errors?: SandreValidationError[];
  /** Raw JSON response from SANDRE */
  raw: SandreValidationResult;
}
