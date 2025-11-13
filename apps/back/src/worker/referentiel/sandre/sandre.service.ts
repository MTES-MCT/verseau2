import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import {
  SandreUploadParams,
  SandreTokenResponse,
  SandreValidationResult,
  AcceptationStatus,
  SandreValidationSummary,
} from './sandre';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class SandreService {
  private readonly logger = new LoggerService(SandreService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl = 'http://www.sandre.eaufrance.fr/PS5/api';

  constructor() {
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

    // Handle XML file - can be Buffer or file path
    if (Buffer.isBuffer(params.xml)) {
      formData.append('XML', params.xml, {
        filename: 'file.xml',
        contentType: 'application/xml',
      });
    } else {
      // If it's a file path, we need to read it
      // For now, assume it's already a Buffer or handle as string
      formData.append('XML', params.xml, {
        filename: 'file.xml',
        contentType: 'application/xml',
      });
    }

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
          `SANDRE validation fetch failed: ${error.message}${error.response ? ` - Status: ${error.response.status}` : ''}`,
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
      validationResult = await this.getValidationResult(tokenResponse.jeton);
      const acceptationStatus = parseInt(validationResult.ACQ.AccuseReception.Acceptation, 10) as AcceptationStatus;

      // Check if validation is complete (not waiting or processing)
      if (
        acceptationStatus === AcceptationStatus.CONFORMANT ||
        acceptationStatus === AcceptationStatus.NON_CONFORMANT
      ) {
        break;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    if (!validationResult) {
      throw new Error('Failed to get validation result from SANDRE');
    }

    const acceptationStatus = parseInt(validationResult.ACQ.AccuseReception.Acceptation, 10) as AcceptationStatus;
    const isConformant = acceptationStatus === AcceptationStatus.CONFORMANT;

    // Extract error information if present
    const error = validationResult.ACQ.AccuseReception.Erreur
      ? {
          code: validationResult.ACQ.AccuseReception.Erreur.CdErreur,
          message: validationResult.ACQ.AccuseReception.Erreur.DescriptifErreur,
          location: validationResult.ACQ.AccuseReception.Erreur.LocationErreur,
          ligne: validationResult.ACQ.AccuseReception.Erreur.LigneErreur,
          colonne: validationResult.ACQ.AccuseReception.Erreur.ColonneErreur,
          severite: validationResult.ACQ.AccuseReception.Erreur['@attributes'].SeveriteErreur,
        }
      : undefined;

    return {
      isConformant,
      acceptationStatus,
      jeton: validationResult.ACQ.AccuseReception.Jeton,
      codeScenario: validationResult.ACQ.AccuseReception.CodeScenario,
      versionScenario: validationResult.ACQ.AccuseReception.VersionScenario,
      error,
    };
  }
}
