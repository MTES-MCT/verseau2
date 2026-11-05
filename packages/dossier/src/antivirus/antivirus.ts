import { z } from 'zod';

export enum AntivirusStatus {
  PENDING = 'pending',
  CLEAN = 'clean',
  IGNORED = 'ignored',
  INFECTED = 'infected',
  ERROR = 'error',
}

export function isAntivirusAccepted(status: AntivirusStatus | null | undefined): boolean {
  return status === AntivirusStatus.CLEAN || status === AntivirusStatus.IGNORED;
}

const timestamp = z.iso.datetime({ offset: true });
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const version = z.string().trim().min(1).max(256);
const signatureVersion = z
  .string()
  .min(1)
  .max(256)
  .refine((value) => !/[^0-9]/.test(value), 'Expected ASCII decimal database version digits');
export const antivirusScannerErrorCodeSchema = z.enum([
  'SCAN_LIMIT_EXCEEDED',
  'ENCRYPTED_CONTENT',
  'PAYLOAD_TOO_LARGE',
  'INVALID_REQUEST',
  'TRUNCATED_REQUEST',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'UNSUPPORTED_MEDIA_TYPE',
  'BUSY',
  'CLAMD_UNAVAILABLE',
  'CLAMD_PROTOCOL',
  'STALE_SIGNATURES',
  'ENGINE_CHANGED',
  'SCAN_TIMEOUT',
  'INTERNAL_ERROR',
]);
const metadata = {
  scannedAt: timestamp,
  sha256,
  engineVersion: version,
  signatureVersion,
  signatureUpdatedAt: timestamp,
};
const failureMetadata = {
  scannedAt: timestamp.nullish(),
  sha256: sha256.nullish(),
  engineVersion: version.nullish(),
  signatureVersion: signatureVersion.nullish(),
  signatureUpdatedAt: timestamp.nullish(),
  errorCode: z.string().trim().min(1).max(256),
};

/** Private POST /scan response. Successful verdicts always describe the complete input. */
export const antivirusScanResponseSchema = z.discriminatedUnion('verdict', [
  z.object({
    ...metadata,
    verdict: z.literal('clean'),
    retryable: z.literal(false),
    errorCode: z.never().optional(),
    detection: z.never().optional(),
  }),
  z.object({
    ...metadata,
    verdict: z.literal('infected'),
    retryable: z.literal(false),
    detection: z
      .string()
      .regex(/^[A-Za-z0-9_.:+/()-]{1,256}$/)
      .optional(),
    errorCode: z.never().optional(),
  }),
  z.object({ ...failureMetadata, verdict: z.literal('unscannable'), retryable: z.literal(false) }),
  z.object({ ...failureMetadata, verdict: z.literal('error'), retryable: z.boolean() }),
]);

export type AntivirusScanResponse = z.infer<typeof antivirusScanResponseSchema>;
export type AntivirusScanResult = Extract<AntivirusScanResponse, { verdict: 'clean' | 'infected' }>;
export type AntivirusScanFailure = Exclude<AntivirusScanResponse, AntivirusScanResult>;
