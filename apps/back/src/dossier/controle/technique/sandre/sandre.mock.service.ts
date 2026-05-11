import { Injectable } from '@nestjs/common';
import { SandreAcceptationStatus } from '@lib/dossier';
import { SandreTokenResponse, SandreUploadParams, SandreValidationResult } from './sandre';
import { LoggerService } from '@shared/logger/logger.service';

interface MockValidationData {
  jeton: string;
  acceptationStatus: SandreAcceptationStatus;
  isConformant: boolean;
  codeScenario: string;
  versionScenario: string;
  error?: {
    code: string;
    message: string;
    location: string;
    ligne: string;
    colonne: string;
    severite: string;
  };
}

export interface SandreMockServiceOptions {
  defaultBehavior?: 'conformant' | 'non-conformant' | 'random';
  conformantRate?: number;
}

@Injectable()
export class SandreMockService {
  private readonly validationResults = new Map<string, MockValidationData>();
  private readonly defaultBehavior: 'conformant' | 'non-conformant' | 'random';
  private readonly conformantRate: number;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(SandreMockService.name);
    const envBehavior = process.env.SANDRE_MOCK_BEHAVIOR as 'conformant' | 'non-conformant' | 'random' | undefined;
    const envConformantRate = process.env.SANDRE_MOCK_CONFORMANT_RATE
      ? parseFloat(process.env.SANDRE_MOCK_CONFORMANT_RATE)
      : undefined;

    this.defaultBehavior = envBehavior || 'conformant';
    this.conformantRate = envConformantRate ?? 0.5;

    this.logger.debug('SANDRE Mock Service initialized', {
      defaultBehavior: this.defaultBehavior,
      conformantRate: this.conformantRate,
    });
  }

  /**
   * Upload a file to SANDRE for validation (mock)
   * @param params Upload parameters including file and scenario information
   * @returns Token response with links to check validation status
   */
  async validateFile(params: SandreUploadParams): Promise<SandreTokenResponse> {
    this.logger.warn('MOCK: Validating file with SANDRE', {
      xsd: params.xsd,
      nomSI: params.nomSI,
      versionSI: params.versionSI,
    });

    // Generate a unique mock token
    const jeton = `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Parse scenario code and version from xsd (format: "SCENARIO;VERSION")
    const [codeScenario, versionScenario] = params.xsd.split(';');

    // Determine validation result based on configured behavior
    const isConformant = this.determineConformity();
    const acceptationStatus = isConformant
      ? SandreAcceptationStatus.CONFORMANT
      : SandreAcceptationStatus.NON_CONFORMANT;

    // Store validation result for later retrieval
    const validationData: MockValidationData = {
      jeton,
      acceptationStatus,
      isConformant,
      codeScenario: codeScenario || 'LABO_DEST',
      versionScenario: versionScenario || '1',
      error: isConformant
        ? undefined
        : {
            code: 'MOCK_ERROR_001',
            message: 'Mock validation error: File does not conform to schema',
            location: '/root/element[1]',
            ligne: '10',
            colonne: '5',
            severite: 'ERREUR',
          },
    };

    this.validationResults.set(jeton, validationData);

    this.logger.warn('MOCK: File uploaded successfully', {
      jeton,
      isConformant,
      acceptationStatus,
    });

    return {
      jeton,
      lienAcquittement: `http://mock.sandre.eaufrance.fr/acquittement/${jeton}`,
      lienCertificat: `http://mock.sandre.eaufrance.fr/certificat/${jeton}`,
    };
  }

  /**
   * Get validation result for a given token (mock)
   * @param token The jeton token from validateFile response
   * @returns Validation result with status and errors
   */
  async getValidationResult(token: string): Promise<SandreValidationResult> {
    this.logger.warn('MOCK: Fetching validation result', { token });

    const validationData = this.validationResults.get(token);
    if (!validationData) {
      throw new Error(`Mock validation result not found for token: ${token}`);
    }

    // Build mock response matching the real SANDRE API structure
    const mockResult: SandreValidationResult = {
      ACQ: {
        Scenario: {
          CodeScenario: validationData.codeScenario,
          VersionScenario: validationData.versionScenario,
          NomScenario: `Mock Scenario ${validationData.codeScenario}`,
          DateCreationFichier: new Date().toISOString(),
          ReferenceFichierEnvoi: 'MOCK_REFERENCE',
          Emetteur: {
            'CdIntervenant@attributes': {
              schemeAgencyID: 'MOCK_SCHEME',
            },
            CdIntervenant: 'MOCK_CD_INTERVENANT',
            NomIntervenant: 'Mock Intervenant',
            Service: {
              NomService: 'Mock Service',
            },
            Contact: {
              NomContact: 'Mock',
              PrenomContact: 'Contact',
              MelContact: 'mock@example.com',
            },
            SI: {
              NomSI: 'Mock SI',
              VersionSI: '1.0',
              AdresseIP: '127.0.0.1',
            },
          },
          Destinataire: {
            'CdIntervenant@attributes': {
              schemeAgencyID: 'MOCK_SCHEME',
            },
            CdIntervenant: 'MOCK_CD_DEST',
            NomIntervenant: 'Mock Destinataire',
            Service: {
              NomService: 'Mock Service',
            },
            Contact: {
              NomContact: 'Mock',
              PrenomContact: 'Contact',
              MelContact: 'mock@example.com',
            },
            SI: {
              NomSI: 'Mock SI',
              VersionSI: '1.0',
              AdresseIP: '127.0.0.1',
            },
          },
        },
        AccuseReception: {
          Acceptation: validationData.acceptationStatus.toString(),
          CodeScenario: validationData.codeScenario,
          VersionScenario: validationData.versionScenario,
          NomScenario: `Mock Scenario ${validationData.codeScenario}`,
          DateCreationFichier: new Date().toISOString(),
          ReferenceFichierEnvoi: 'MOCK_REFERENCE',
          CleSecuFichierEnvoi: 'MOCK_SECURITY_KEY',
          Jeton: validationData.jeton,
          TailleFichier: '1024',
          DateMAJSchemaXML: new Date().toISOString(),
          DateMAJSchematronReferentiel: new Date().toISOString(),
          DateMAJSchematronReglesMetier: new Date().toISOString(),
          TempsEtape0: '100',
          TempsEtape1: '200',
          TempsEtape2: '300',
          TempsEtape3: '400',
          TempsEtape4: '500',
          TempsEtape5: '600',
          ...(validationData.error && {
            'Erreur@attributes': {
              SeveriteErreur: validationData.error.severite,
            },
            Erreur: {
              '@attributes': {
                SeveriteErreur: validationData.error.severite,
              },
              CdErreur: validationData.error.code,
              LocationErreur: validationData.error.location,
              DescriptifErreur: validationData.error.message,
              LigneErreur: validationData.error.ligne,
              ColonneErreur: validationData.error.colonne,
            },
          }),
        },
      },
    };

    return mockResult;
  }

  /**
   * Determine if the validation should be conformant based on configured behavior
   */
  private determineConformity(): boolean {
    switch (this.defaultBehavior) {
      case 'conformant':
        return true;
      case 'non-conformant':
        return false;
      case 'random':
        return Math.random() < this.conformantRate;
      default:
        return true;
    }
  }

  /**
   * Clear all stored validation results (useful for testing)
   */
  clearValidationResults(): void {
    this.validationResults.clear();
    this.logger.log('Mock: All validation results cleared');
  }

  /**
   * Get the number of stored validation results (useful for testing)
   */
  getValidationResultsCount(): number {
    return this.validationResults.size;
  }
}
