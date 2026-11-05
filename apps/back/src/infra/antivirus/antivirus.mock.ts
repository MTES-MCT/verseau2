import { createHash } from 'node:crypto';
import type { AntivirusScanResult } from '@lib/dossier';
import type { AntivirusGateway } from './antivirus.gateway';
import type { Readable } from 'node:stream';

/** DI/test override only. Never selected from environment configuration. */
export class MockAntivirusGateway implements AntivirusGateway {
  async scanStream(stream: Readable, size: number, signal?: AbortSignal): Promise<AntivirusScanResult> {
    const hash = createHash('sha256');
    let bytes = 0;
    try {
      for await (const chunk of stream as AsyncIterable<Buffer>) {
        signal?.throwIfAborted();
        bytes += chunk.length;
        hash.update(chunk);
      }
      if (bytes !== size) {
        throw new Error('Mock scan length mismatch');
      }
      return { ...(await this.scan(Buffer.alloc(0))), sha256: hash.digest('hex') };
    } finally {
      stream.destroy();
    }
  }

  scan(buffer: Buffer): Promise<AntivirusScanResult> {
    return Promise.resolve({
      verdict: 'clean',
      retryable: false,
      scannedAt: new Date().toISOString(),
      sha256: createHash('sha256').update(buffer).digest('hex'),
      engineVersion: 'mock',
      signatureVersion: '0',
      signatureUpdatedAt: new Date().toISOString(),
    });
  }
}
