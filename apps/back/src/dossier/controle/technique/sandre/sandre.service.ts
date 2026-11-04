import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { z } from 'zod';
import type { SandreTaskReference, SandreUploadParams, SandreValidationResult } from './sandre';
import { LoggerService } from '@shared/logger/logger.service';

export class SandreTaskFailedError extends Error {}

const identifier = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/);
const uploadSchema = z.object({ sessionId: identifier, taskId: identifier });
const taskSchema = z.object({
  taskId: identifier,
  status: z.enum(['PENDING', 'RUNNING', 'DONE', 'FAILED']),
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
      Jeton: z.string().min(1),
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
  private readonly baseUrl: string;

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(SandreService.name);
    const url = new URL(process.env.SANDRE_API_URL || 'https://www.sandre.eaufrance.fr/parseur');
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('SANDRE_API_URL must be an HTTPS base URL without credentials/query/fragment');
    }
    if (url.hostname === 'sandre.eaufrance.fr') {
      url.hostname = 'www.sandre.eaufrance.fr';
    }
    this.baseUrl = url.toString().replace(/\/$/, '');
    this.httpClient = axios.create({
      timeout: 30000, // 30 seconds timeout
      maxRedirects: 0, // Never send XML or trust a response from another origin/protocol
      maxBodyLength: 75 * 1024 * 1024, // 70 MiB upload limit plus multipart overhead
      maxContentLength: 20 * 1024 * 1024, // Bound decompressed API responses
    });
  }

  async validateFile(params: SandreUploadParams): Promise<SandreTaskReference> {
    const form = new FormData();
    form.append('file', params.xml, { filename: 'file.xml', contentType: 'application/xml' });
    const response = await this.httpClient
      .post<unknown>(`${this.baseUrl}/api/v1/upload-and-validate`, form, {
        headers: { ...form.getHeaders(), Accept: 'application/json' },
        params: { rgpdConsent: true },
        responseType: 'json',
      })
      .catch((error: unknown) => {
        if (axios.isAxiosError<unknown>(error) && error.response) {
          const data = error.response.data;
          const body = typeof data === 'string' ? data : (JSON.stringify(data) ?? '');
          this.logger.error('SANDRE upload rejected', {
            statusCode: error.response.status,
            responseBody: body.slice(0, 4096),
            responseBodyTruncated: body.length > 4096,
          });
        }
        throw error;
      });
    const body = typeof response.data === 'string' ? response.data : (JSON.stringify(response.data) ?? '');
    this.logger.log('SANDRE upload response', {
      statusCode: response.status,
      responseBody: body.slice(0, 4096),
      responseBodyTruncated: body.length > 4096,
    });
    // The prose specifies 202; the generated OpenAPI response table specifies 200.
    if (response.status !== 202 && response.status !== 200) {
      throw new Error('Unexpected SANDRE upload HTTP status');
    }
    const upload = uploadSchema.parse(response.data);
    this.logger.log('File uploaded to SANDRE', { sessionId: upload.sessionId, taskId: upload.taskId });
    return { sessionId: upload.sessionId, taskId: upload.taskId };
  }

  /** null means still running, not non-conformant. Only DONE permits reading the ACQ. */
  async getValidationResult(reference: SandreTaskReference): Promise<SandreValidationResult | null> {
    identifier.parse(reference.sessionId);
    identifier.parse(reference.taskId);
    const response = await this.httpClient.get<unknown>(`${this.baseUrl}/api/v1/validation/tasks/${reference.taskId}`, {
      ...this.jsonOptions(),
      validateStatus: (status) => [200, 202, 422].includes(status),
    });
    const task = taskSchema.parse(response.data);
    if (task.taskId !== reference.taskId) {
      throw new Error('SANDRE task identifier mismatch');
    }
    if (response.status === 422 && task.status === 'FAILED') {
      throw new SandreTaskFailedError('SANDRE task failed technically');
    }
    if (response.status === 202 && (task.status === 'PENDING' || task.status === 'RUNNING')) {
      return null;
    }
    if (response.status !== 200 || task.status !== 'DONE') {
      throw new Error('Inconsistent SANDRE task status');
    }
    const acq = await this.httpClient.get<unknown>(
      `${this.baseUrl}/api/v1/acquittement/${reference.taskId}/json`,
      this.jsonOptions(),
    );
    if (acq.status !== 200) {
      throw new Error('Unexpected SANDRE acquittement HTTP status');
    }
    sandreValidationSchema.parse(acq.data);
    const result = acq.data as SandreValidationResult;
    const receipt = result.ACQ.AccuseReception;
    if (!['1', '2'].includes(receipt.Acceptation)) {
      throw new Error('SANDRE DONE task returned a non-final ACQ');
    }
    return result;
  }

  /** Finish polling jobs queued before the native API migration. */
  async getLegacyValidationResult(jeton: string): Promise<SandreValidationResult> {
    identifier.parse(jeton);
    const response = await this.httpClient.get<unknown>(
      `https://www.sandre.eaufrance.fr/PS5/api/acquittement/${jeton}`,
      this.jsonOptions(),
    );
    sandreValidationSchema.parse(response.data);
    const result = response.data as SandreValidationResult;
    if (result.ACQ.AccuseReception.Jeton !== jeton) {
      throw new Error('Legacy SANDRE token mismatch');
    }
    return result;
  }

  private jsonOptions() {
    return { headers: { Accept: 'application/json' }, responseType: 'json' as const };
  }
}
