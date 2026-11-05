import type { AntivirusScanResult } from '@lib/dossier';
import type { Readable } from 'node:stream';

export interface AntivirusGateway {
  /** Throws AntivirusScanError on every inconclusive scan; never assumes clean. */
  scan(buffer: Buffer): Promise<AntivirusScanResult>;
  /** Consumes/destroys the stream, verifying its length and digest without buffering it. */
  scanStream(stream: Readable, size: number, signal?: AbortSignal): Promise<AntivirusScanResult>;
}

export const AntivirusGateway = Symbol('AntivirusGateway');
