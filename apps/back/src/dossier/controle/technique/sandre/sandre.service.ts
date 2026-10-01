import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { z } from 'zod';
import { SandreTokenResponse, SandreUploadParams, SandreValidationResult } from './sandre';
import { LoggerService } from '@shared/logger/logger.service';

const sandreTokenSchema = z.object({
  token: z.object({
    jeton: z.string().regex(/^[A-Za-z0-9_-]+$/),
    lienAcquittement: z.string(),
    lienCertificat: z.string(),
  }),
});

const sandreErreurSchema = z.object({
  CdErreur: z.string(),
  DescriptifErreur: z.string(),
  LocationErreur: z.string().optional(),
  LigneErreur: z.string().optional(),
  ColonneErreur: z.string().optional(),
  '@attributes': z.object({ SeveriteErreur: z.string() }).optional(),
});

const sandreValidationSchema = z.object({
  ACQ: z.object({
    AccuseReception: z.object({
      Acceptation: z.enum(['0', '1', '2', '3']),
      Jeton: z.string(),
      CodeScenario: z.string(),
      VersionScenario: z.string(),
      'Erreur@attributes': z.object({ SeveriteErreur: z.string() }).optional(),
      Erreur: z
        .union([
          sandreErreurSchema,
          z.array(
            z.union([
              sandreErreurSchema,
              z.object({
                Erreur: sandreErreurSchema,
                'Erreur@attributes': z.object({ SeveriteErreur: z.string() }).optional(),
              }),
            ]),
          ),
        ])
        .optional(),
    }),
  }),
});

@Injectable()
export class SandreService {
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl = process.env.SANDRE_API_URL || 'https://www.sandre.eaufrance.fr/PS5/api';

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(SandreService.name);
    this.httpClient = axios.create({
      timeout: 30000, // 30 seconds timeout
      maxRedirects: 0, // Never send XML or trust a response from another origin/protocol
      maxBodyLength: 75 * 1024 * 1024, // 70 MiB upload limit plus multipart overhead
      maxContentLength: 20 * 1024 * 1024, // Bound decompressed API responses
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
      const response = await this.httpClient.post<unknown>(`${this.baseUrl}/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        responseType: 'json',
      });
      // Reject malformed responses before using the token to schedule polling.
      const tokenResponse = sandreTokenSchema.parse(response.data).token;

      // Log the raw response for debugging
      this.logger.debug('SANDRE upload response received', {
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
      this.logger.debug('Failed to upload file to SANDRE', error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `SANDRE upload failed: ${error.message}${error.response ? ` - Status: ${error.response.status}` : ''}`,
          { cause: error },
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
    this.logger.debug('Fetching validation result', { jeton: token });

    try {
      const response = await this.httpClient.get<unknown>(`${this.baseUrl}/acquittement/${encodeURIComponent(token)}`, {
        headers: {
          Accept: 'application/json',
        },
        responseType: 'json',
      });
      // Validate every field consumed by the poller/mapper before it can decide conformity.
      // Keep the original document (including additional SANDRE metadata) for persistence.
      sandreValidationSchema.parse(response.data);
      const validationResult = response.data as SandreValidationResult;
      if (validationResult.ACQ.AccuseReception.Jeton !== token) {
        throw new Error('SANDRE acquittement token does not match the requested token');
      }

      return validationResult;
    } catch (error) {
      this.logger.debug('Failed to fetch validation result', error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `SANDRE validation fetch failed: ${error.message}${
            error.response ? ` - Status: ${error.response.status}` : ''
          }`,
          { cause: error },
        );
      }
      throw error;
    }
  }
}
