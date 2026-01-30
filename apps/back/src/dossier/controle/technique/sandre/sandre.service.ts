import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { SandreAcceptationStatus } from '@lib/dossier';
import {
  SandreTokenResponse,
  SandreUploadParams,
  SandreValidationError,
  SandreValidationResult,
  SandreValidationSummary,
} from './sandre';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class SandreService {
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl = 'http://www.sandre.eaufrance.fr/PS5/api';

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(SandreService.name);
    this.httpClient = axios.create({
      timeout: 30000, // 30 seconds timeout
    });
  }

  /**
   * Upload a file to SANDRE for validation
   * @param params Upload parameters including file and scenario information
   * @returns Token response with links to check validation status
   */
  async validateFile(params: SandreUploadParams): Promise<SandreTokenResponse> {
    this.logger.log('Validating file with SANDRE', {
      xsd: params.xsd,
      nomSI: params.nomSI,
      versionSI: params.versionSI,
    });

    const formData = new FormData();
    formData.append('XML', params.xml, {
      filename: 'file.xml',
      contentType: 'application/xml',
    });

    // Required fields
    formData.append('XSD', params.xsd);
    formData.append('NomSI', params.nomSI);
    formData.append('VersionSI', params.versionSI);

    // Optional fields
    if (params.nomIntervenant) {
      formData.append('NomIntervenant', params.nomIntervenant);
    }
    if (params.cdIntervenant) {
      formData.append('CdIntervenant', params.cdIntervenant);
    }
    if (params.schemeAgencyID) {
      formData.append('schemeAgencyID', params.schemeAgencyID);
    }
    if (params.email) {
      formData.append('email', params.email);
    }
    if (params.nom) {
      formData.append('nom', params.nom);
    }
    if (params.prenom) {
      formData.append('prenom', params.prenom);
    }
    if (params.nomService) {
      formData.append('NomService', params.nomService);
    }

    try {
      const response = await this.httpClient.post<{ token: SandreTokenResponse }>(`${this.baseUrl}/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'json',
      });
      // Ensure response.data is a string
      const tokenResponse = response.data.token;

      // Log the raw response for debugging
      this.logger.log('SANDRE upload response received', {
        jeton: tokenResponse.jeton,
        lienAcquittement: tokenResponse.lienAcquittement,
        lienCertificat: tokenResponse.lienCertificat,
        statusCode: response.status,
      });

      this.logger.log('File uploaded successfully', {
        jeton: tokenResponse.jeton,
      });

      return tokenResponse;
    } catch (error) {
      this.logger.error('Failed to upload file to SANDRE', error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `SANDRE upload failed: ${error.message}${error.response ? ` - Status: ${error.response.status}` : ''}`,
        );
      }
      throw error;
    }
  }

  /**
   * Get validation result for a given token
   * @param token The jeton token from validateFile response
   * @returns Validation result with status and errors
   */
  async getValidationResult(token: string): Promise<SandreValidationResult> {
    this.logger.log('Fetching validation result', { token });

    try {
      const response = await this.httpClient.get<SandreValidationResult>(`${this.baseUrl}/acquittement/${token}`, {
        headers: {
          Accept: 'application/json',
        },
        responseType: 'json',
      });
      const validationResult = response.data;

      return validationResult;
    } catch (error) {
      this.logger.error('Failed to fetch validation result', error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `SANDRE validation fetch failed: ${error.message}${
            error.response ? ` - Status: ${error.response.status}` : ''
          }`,
        );
      }
      throw error;
    }
  }

  /**
   * Validate a file with SANDRE and wait for the validation result
   * This method uploads the file, polls for results, and returns a summary
   * @param params Upload parameters including file and scenario information
   * @param options Optional configuration for polling behavior
   * @returns Validation summary with status, conformance, and error information
   */
  async validateFileAndWait(
    params: SandreUploadParams,
    options?: {
      /** Polling interval in milliseconds (default: 10000) */
      pollInterval?: number;
      /** Maximum number of polling attempts (default: 600, which is 10 minutes at 10s intervals) */
      maxAttempts?: number;
    },
  ): Promise<SandreValidationSummary> {
    const pollInterval = options?.pollInterval ?? 10000; // 10 seconds
    const maxAttempts = options?.maxAttempts ?? 600; // 10 minutes

    // Upload file and get token
    const tokenResponse = await this.validateFile(params);

    this.logger.log('File uploaded to SANDRE', {
      jeton: tokenResponse.jeton,
      lienAcquittement: tokenResponse.lienAcquittement,
    });

    // Poll for validation result
    let validationResult: SandreValidationResult | null = null;
    for (let i = 0; i < maxAttempts; i++) {
      const validation = await this.getValidationResult(tokenResponse.jeton);
      const acceptationStatus = Number(validation.ACQ.AccuseReception.Acceptation) as SandreAcceptationStatus;

      validationResult = validation;

      // Check if validation is complete (not waiting or processing)
      if (
        acceptationStatus === SandreAcceptationStatus.CONFORMANT ||
        acceptationStatus === SandreAcceptationStatus.NON_CONFORMANT
      ) {
        break;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    if (!validationResult) {
      throw new Error('Failed to get validation result from SANDRE');
    }

    const acceptationStatus = Number(validationResult.ACQ.AccuseReception.Acceptation) as SandreAcceptationStatus;
    const isConformant = acceptationStatus === SandreAcceptationStatus.CONFORMANT;

    // Extract error information if present
    const rawErreur = validationResult.ACQ.AccuseReception.Erreur;
    const globalSeverity = validationResult.ACQ.AccuseReception['Erreur@attributes']?.SeveriteErreur;

    let errors: SandreValidationError[] = [];

    if (Array.isArray(rawErreur)) {
      errors = rawErreur.map((item) => {
        if ('Erreur' in item) {
          const nested = item;
          return {
            code: nested.Erreur.CdErreur,
            message: nested.Erreur.DescriptifErreur,
            location: nested.Erreur.LocationErreur,
            ligne: nested.Erreur.LigneErreur,
            colonne: nested.Erreur.ColonneErreur,
            severite:
              nested.Erreur['@attributes']?.SeveriteErreur ??
              nested['Erreur@attributes']?.SeveriteErreur ??
              globalSeverity,
          };
        } else {
          const simple = item;
          return {
            code: simple.CdErreur,
            message: simple.DescriptifErreur,
            location: simple.LocationErreur,
            ligne: simple.LigneErreur,
            colonne: simple.ColonneErreur,
            severite: simple['@attributes']?.SeveriteErreur ?? globalSeverity,
          };
        }
      });
    } else if (rawErreur) {
      const simple = rawErreur;
      errors = [
        {
          code: simple.CdErreur,
          message: simple.DescriptifErreur,
          location: simple.LocationErreur,
          ligne: simple.LigneErreur,
          colonne: simple.ColonneErreur,
          severite: simple['@attributes']?.SeveriteErreur ?? globalSeverity,
        },
      ];
    }

    const error = errors.length > 0 ? errors[0] : undefined;

    return {
      isConformant,
      acceptationStatus,
      jeton: validationResult.ACQ.AccuseReception.Jeton,
      codeScenario: validationResult.ACQ.AccuseReception.CodeScenario,
      versionScenario: validationResult.ACQ.AccuseReception.VersionScenario,
      error,
      errors,
      raw: validationResult,
    };
  }
}
