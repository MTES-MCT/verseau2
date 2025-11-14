/**
 * SANDRE Parseur V5 Webservice Types
 */

export enum AcceptationStatus {
  WAITING = 3,
  PROCESSING = 0,
  CONFORMANT = 1,
  NON_CONFORMANT = 2,
}

export interface SandreUploadParams {
  /** File to validate (ZIP or XML) - can be Buffer or file path */
  xml: Buffer | string;
  /** Scenario code and version in format "SCENARIO;VERSION" (e.g., "LABO_DEST;1") */
  xsd: string;
  /** Name of the client system */
  nomSI: string;
  /** Version of the client system */
  versionSI: string;
  /** Optional: Name of sender */
  nomIntervenant?: string;
  /** Optional: Identifier (e.g., SIRET) */
  cdIntervenant?: string;
  /** Optional: Code origin (e.g., SIRET) */
  schemeAgencyID?: string;
  /** Optional: Email of sender */
  email?: string;
  /** Optional: Contact last name */
  nom?: string;
  /** Optional: Contact first name */
  prenom?: string;
  /** Optional: Name of service */
  nomService?: string;
}

export interface SandreTokenResponse {
  /** Alphanumeric token identifying the request */
  jeton: string;
  /** URL to retrieve XML result */
  lienAcquittement: string;
  /** URL to retrieve HTML certificate */
  lienCertificat: string;
}

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
  '@attributes': SandreErreurAttributes;
  CdErreur: string;
  LocationErreur: string;
  DescriptifErreur: string;
  LigneErreur: string;
  ColonneErreur: string;
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
  Erreur?: SandreErreur;
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
  location: string;
  ligne: string;
  colonne: string;
  severite: string;
}

export interface SandreValidationSummary {
  /** Whether the file is conformant */
  isConformant: boolean;
  /** The acceptance status */
  acceptationStatus: AcceptationStatus;
  /** The token/jeton from the validation */
  jeton: string;
  /** The scenario code */
  codeScenario: string;
  /** The scenario version */
  versionScenario: string;
  /** Error information if validation failed */
  error?: SandreValidationError;
}
