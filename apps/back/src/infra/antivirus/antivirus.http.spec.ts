/* eslint-disable @typescript-eslint/unbound-method */
import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { inspect } from 'node:util';
import { createMock } from '@golevelup/ts-jest';
import { AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';
import { LoggerService } from '@shared/logger/logger.service';
import { HttpAntivirusGateway } from './antivirus.http';
import {
  AntivirusProtocolError,
  AntivirusScanError,
  AntivirusTransientError,
  AntivirusUnscannableError,
} from './antivirus.errors';

describe('HttpAntivirusGateway', () => {
  const token = 'token-sentinel-never-log-1234567890';
  const buffer = Buffer.from('<xml>content-sentinel filename-sentinel.xml</xml>');
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const metadata = {
    scannedAt: '2026-11-05T12:00:00.000Z',
    sha256,
    engineVersion: '1.4.3',
    signatureVersion: '27800',
    signatureUpdatedAt: '2026-11-05T09:00:00.000Z',
  };
  const clean = { ...metadata, verdict: 'clean', retryable: false };
  const config = { url: 'http://antivirus.internal:3011/scan', token, timeoutMs: 150_000 };
  let client: ReturnType<typeof createMock<AxiosInstance>>;
  let gateway: HttpAntivirusGateway;

  beforeEach(() => {
    client = createMock<AxiosInstance>();
    gateway = new HttpAntivirusGateway(config, client);
  });

  function respond(data: unknown, status = 200) {
    const response = createMock<AxiosResponse<unknown>>({ status, headers: { 'content-type': 'application/json' } });
    response.data = data;
    client.post.mockResolvedValue(response);
  }

  it.each(['clean', 'infected'] as const)('accepts a verified complete %s verdict', async (verdict) => {
    const result = { ...clean, verdict, ...(verdict === 'infected' ? { detection: 'Win.Test.EICAR_HDB-1' } : {}) };
    respond(result);
    await expect(gateway.scan(buffer)).resolves.toEqual(result);
    expect(client.post).toHaveBeenCalledWith(
      config.url,
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(buffer.length),
        }) as unknown,
        maxRedirects: 0,
        proxy: false,
        maxContentLength: 16384,
        timeout: 150000,
      }),
    );
  });

  it.each(['scannedAt', 'sha256', 'engineVersion', 'signatureVersion', 'signatureUpdatedAt'])(
    'rejects missing or null %s',
    async (key) => {
      for (const value of [undefined, null]) {
        respond({ ...clean, [key]: value });
        await expect(gateway.scan(buffer)).rejects.toMatchObject({
          code: 'SCANNER_INVALID_RESPONSE',
          retryable: false,
        });
      }
    },
  );

  describe.each(['clean', 'infected'] as const)('%s signature database version', (verdict) => {
    it.each(['0', '00027800', '9'.repeat(256)])(
      'accepts bounded decimal signatureVersion %j unchanged',
      async (signatureVersion) => {
        const response = { ...clean, verdict, signatureVersion };
        respond(response);
        await expect(gateway.scan(buffer)).resolves.toEqual(response);
      },
    );

    it.each([
      'not-a-decimal-database-version',
      '1.4.3',
      '-27800',
      '+27800',
      '2.78e4',
      ' 27800',
      '27800 ',
      '27800\n',
      '２７８００',
      '',
      '1'.repeat(257),
    ])('rejects malformed signatureVersion %j despite a matching digest', async (signatureVersion) => {
      respond({ ...clean, verdict, signatureVersion });
      await expect(gateway.scan(buffer)).rejects.toMatchObject({
        code: 'SCANNER_INVALID_RESPONSE',
        retryable: false,
      });
    });
  });

  it.each([
    { sha256: 'a'.repeat(64) },
    { sha256: sha256.toUpperCase() },
    { sha256: '' },
    { verdict: 'unknown' },
    { retryable: true },
    { scannedAt: 'yesterday' },
    { signatureUpdatedAt: '2026-02-30T00:00:00Z' },
    { engineVersion: ' ' },
    { detection: 'not-valid-on-clean' },
  ])('fails closed for invalid success %j', async (override) => {
    respond({ ...clean, ...override });
    await expect(gateway.scan(buffer)).rejects.toBeInstanceOf(AntivirusProtocolError);
  });

  it('rejects non-JSON content types even when the body looks valid', async () => {
    client.post.mockResolvedValue(
      createMock<AxiosResponse>({ status: 200, data: clean, headers: { 'content-type': 'text/html' } }),
    );
    await expect(gateway.scan(buffer)).rejects.toMatchObject({ code: 'SCANNER_INVALID_RESPONSE' });
  });

  it.each(['SCAN_LIMIT_EXCEEDED', 'ENCRYPTED_CONTENT'])(
    'preserves deterministic %s without retry',
    async (errorCode) => {
      respond({ ...metadata, verdict: 'unscannable', errorCode, retryable: false });
      await expect(gateway.scan(buffer)).rejects.toMatchObject({
        code: errorCode,
        retryable: false,
        failure: { verdict: 'unscannable', errorCode, sha256 },
      });
    },
  );

  it('does not misclassify heuristic scan-limit alerts as infection', async () => {
    respond({ ...clean, verdict: 'infected', detection: 'Heuristics.Limits.Exceeded.MaxFileSize' });
    await expect(gateway.scan(buffer)).rejects.toMatchObject({ code: 'SCAN_LIMIT_EXCEEDED', retryable: false });
  });

  it.each([
    [503, 'BUSY'],
    [503, 'CLAMD_UNAVAILABLE'],
    [503, 'STALE_SIGNATURES'],
    [503, 'ENGINE_CHANGED'],
    [504, 'SCAN_TIMEOUT'],
  ])('preserves transient HTTP %s %s', async (status: number, errorCode: string) => {
    respond(
      {
        verdict: 'error',
        scannedAt: metadata.scannedAt,
        sha256: null,
        engineVersion: null,
        signatureVersion: null,
        signatureUpdatedAt: null,
        errorCode,
        retryable: true,
      },
      status,
    );
    await expect(gateway.scan(buffer)).rejects.toMatchObject({
      code: errorCode,
      retryable: true,
      failure: { sha256, errorCode },
    });
  });

  it('maps HTTP 413 to deterministic unscannable', async () => {
    respond({}, 413);
    await expect(gateway.scan(buffer)).rejects.toBeInstanceOf(AntivirusUnscannableError);
  });

  it.each([400, 415])('maps HTTP %s to deterministic protocol/validation error', async (status) => {
    respond({}, status);
    await expect(gateway.scan(buffer)).rejects.toBeInstanceOf(AntivirusProtocolError);
  });

  it('preserves the explicit oversize reason', async () => {
    respond({ verdict: 'unscannable', errorCode: 'PAYLOAD_TOO_LARGE', retryable: false }, 413);
    await expect(gateway.scan(buffer)).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE', retryable: false });
  });

  it.each([301, 302, 401, 403, 404])('never follows redirects or treats HTTP %s as clean', async (status) => {
    respond(clean, status);
    await expect(gateway.scan(buffer)).rejects.toBeInstanceOf(AntivirusProtocolError);
  });

  it.each([408, 429, 502, 503, 504])('retries bounded transport availability failures HTTP %s', async (status) => {
    respond({}, status);
    await expect(gateway.scan(buffer)).rejects.toBeInstanceOf(AntivirusTransientError);
  });

  it.each(['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'])(
    'maps %s to a sanitized transient error',
    async (code) => {
      client.post.mockRejectedValue(new AxiosError('sensitive raw request', code));
      await expect(gateway.scan(buffer)).rejects.toBeInstanceOf(AntivirusTransientError);
    },
  );

  it.each(['CLAMD_PROTOCOL', 'INVALID_REQUEST'])('does not indefinitely retry deterministic %s', async (errorCode) => {
    respond({ verdict: 'error', errorCode, retryable: false }, 503);
    await expect(gateway.scan(buffer)).rejects.toMatchObject({ code: errorCode, retryable: false });
  });

  it.each(['CLAMD_PROTOCOL', 'INTERNAL_ERROR'])(
    'does not retry scanner %s outside the explicit transient allowlist',
    async (errorCode) => {
      respond({ verdict: 'error', errorCode, retryable: true }, 503);
      await expect(gateway.scan(buffer)).rejects.toMatchObject({ code: errorCode, retryable: false });
    },
  );

  it('rejects arbitrary upstream error text and never logs body/token/filename or an HTTP cause', async () => {
    const log = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const raw = `${token} ${buffer.toString()} filename-sentinel.xml`;
    for (const response of [
      { status: 200, data: raw },
      { status: 503, data: { verdict: 'error', errorCode: raw, retryable: true } },
    ]) {
      respond(response.data, response.status);
      try {
        await gateway.scan(buffer);
        throw new Error('Expected failure');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(AntivirusScanError);
        const logger = new LoggerService('AntivirusSentinel');
        logger.error('Job processing failed', { error });
        expect(inspect(error)).not.toContain(token);
        expect(inspect(error)).not.toContain('content-sentinel');
        expect(inspect(error)).not.toContain('filename-sentinel.xml');
        expect(error).not.toHaveProperty('cause');
      }
    }
    const response = createMock<AxiosResponse<unknown>>();
    response.data = raw;
    client.post.mockRejectedValue(new AxiosError(raw, 'ECONNRESET', undefined, { body: raw }, response));
    const transportError: unknown = await gateway.scan(buffer).catch((error: unknown) => error);
    expect(transportError).toMatchObject({ code: 'SCANNER_UNAVAILABLE' });
    new LoggerService('AntivirusSentinel').error('Job processing failed', { error: transportError });
    expect(inspect(transportError)).not.toMatch(/token-sentinel|content-sentinel|filename-sentinel/);
    expect(log.mock.calls.flat().join('')).not.toMatch(/token-sentinel|content-sentinel|filename-sentinel/);
    log.mockRestore();
  });

  it('streams every byte through a real HTTP request without sending filenames', async () => {
    const large = Buffer.alloc(200_000, 65);
    let server: Server | undefined;
    try {
      server = createServer((request, response) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
          const bytes = Buffer.concat(chunks);
          expect(bytes).toEqual(large);
          expect(request.url).toBe('/scan');
          expect(request.headers.authorization).toBe(`Bearer ${token}`);
          expect(request.headers['content-type']).toBe('application/octet-stream');
          expect(request.headers['content-length']).toBe(String(large.length));
          expect(request.headers['content-disposition']).toBeUndefined();
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ ...clean, sha256: createHash('sha256').update(bytes).digest('hex') }));
        });
      });
      await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected TCP test listener');
      }
      const httpGateway = new HttpAntivirusGateway({ ...config, url: `http://127.0.0.1:${address.port}/scan` });
      await expect(httpGateway.scan(large)).resolves.toMatchObject({ verdict: 'clean' });
    } finally {
      await new Promise<void>((resolve, reject) => server?.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
