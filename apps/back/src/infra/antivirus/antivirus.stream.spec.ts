/* eslint-disable @typescript-eslint/unbound-method */
import { createMock } from '@golevelup/ts-jest';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { createServer, type Server, type RequestListener } from 'node:http';
import { setImmediate } from 'node:timers/promises';
import { AxiosError, type AxiosInstance } from 'axios';
import { MAX_DEPOT_FILE_SIZE_BYTES } from '@lib/dossier';
import { HttpAntivirusGateway } from './antivirus.http';
import { cleanScan } from '../../../test/fixtures/antivirus';

describe('HttpAntivirusGateway.scanStream', () => {
  const content = Buffer.from('<root>streamed XML</root>');
  const clean = cleanScan(content);
  const config = { url: 'http://scanner.internal:3011/scan', token: 'secret-token-sentinel', timeoutMs: 1000 };

  function setup(override: object = {}, status = 200) {
    const client = createMock<AxiosInstance>();
    client.post.mockImplementation(async (_url, stream: Readable) => {
      // The test transport consumes chunks without collecting the request body.
      for await (const _chunk of stream) {
        /* drain */
      }
      return {
        status,
        data: { ...clean, ...override },
        headers: { 'content-type': 'application/json' },
      };
    });
    return { client, gateway: new HttpAntivirusGateway(config, client) };
  }

  it.each(['clean', 'infected'] as const)('verifies every byte of a chunked %s upload', async (verdict) => {
    const { client, gateway } = setup({ verdict });
    const source = Readable.from([content.subarray(0, 5), content.subarray(5)]);
    await expect(gateway.scanStream(source, content.length)).resolves.toMatchObject({ verdict, sha256: clean.sha256 });
    expect(client.post).toHaveBeenCalledWith(
      config.url,
      expect.any(Readable),
      expect.objectContaining({
        maxRedirects: 0,
        proxy: false,
        adapter: 'http',
        headers: expect.objectContaining({ 'Content-Length': String(content.length) }) as unknown,
      }),
    );
    expect(source.destroyed).toBe(true);
  });

  it.each([{ sha256: 'b'.repeat(64) }, { sha256: null }, { signatureVersion: null }, { verdict: 'unknown' }])(
    'fails closed for invalid streaming verdict %j',
    async (override) => {
      const { gateway } = setup(override);
      await expect(gateway.scanStream(Readable.from([content]), content.length)).rejects.toMatchObject({
        retryable: false,
      });
    },
  );

  it.each([content.length - 1, content.length + 1])('rejects a length mismatch against %s bytes', async (size) => {
    const { gateway } = setup();
    const source = Readable.from([content]);
    await expect(gateway.scanStream(source, size)).rejects.toMatchObject({ code: 'SCANNER_LENGTH_MISMATCH' });
    expect(source.destroyed).toBe(true);
  });

  it.each([0, -1, Number.NaN, MAX_DEPOT_FILE_SIZE_BYTES + 1])(
    'rejects invalid size %s before sending bytes',
    async (size) => {
      const { client, gateway } = setup();
      const source = Readable.from([content]);
      await expect(gateway.scanStream(source, size)).rejects.toMatchObject({
        code: 'PAYLOAD_TOO_LARGE',
        retryable: false,
      });
      expect(client.post).not.toHaveBeenCalled();
      expect(source.destroyed).toBe(true);
    },
  );

  it('applies backpressure instead of pulling the entire object into memory', async () => {
    const client = createMock<AxiosInstance>();
    let produced = 0;
    const chunk = Buffer.alloc(64 * 1024);
    const size = 8 * 1024 * 1024;
    const source = new Readable({
      highWaterMark: chunk.length,
      read() {
        produced += chunk.length;
        this.push(chunk);
      },
    });
    client.post.mockImplementation(async () => {
      await setImmediate();
      expect(produced).toBeGreaterThan(0);
      expect(produced).toBeLessThanOrEqual(4 * chunk.length);
      return {
        status: 503,
        data: { verdict: 'error', errorCode: 'BUSY', retryable: true },
        headers: {},
      };
    });
    const gateway = new HttpAntivirusGateway(config, client);
    await expect(gateway.scanStream(source, size)).rejects.toMatchObject({
      code: 'BUSY',
      retryable: true,
      failure: { sha256: null },
    });
    expect(source.destroyed).toBe(true);
  });

  it('destroys S3 on transport failure without exposing client exceptions', async () => {
    const { gateway, client } = setup();
    const source = new Readable({ read() {} });
    client.post.mockRejectedValue(new AxiosError('secret-token-sentinel file.xml', 'ECONNREFUSED'));
    await expect(gateway.scanStream(source, content.length)).rejects.toMatchObject({
      code: 'SCANNER_UNAVAILABLE',
      retryable: true,
    });
    expect(source.destroyed).toBe(true);
  });

  it('cancels a stalled source even when HTTP returns a premature clean verdict', async () => {
    const source = new Readable({ read() {} });
    const client = createMock<AxiosInstance>();
    client.post.mockResolvedValue({
      status: 200,
      data: clean,
      headers: { 'content-type': 'application/json' },
    });
    const gateway = new HttpAntivirusGateway({ ...config, timeoutMs: 30 }, client);
    await expect(gateway.scanStream(source, content.length)).rejects.toMatchObject({
      code: 'SCANNER_TIMEOUT',
      retryable: true,
    });
    expect(source.destroyed).toBe(true);
  });

  it('propagates caller cancellation to a stalled upload', async () => {
    const source = new Readable({ read() {} });
    const controller = new AbortController();
    const { gateway } = setup();
    const result = gateway.scanStream(source, content.length, controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ code: 'SCANNER_TIMEOUT', retryable: true });
    expect(source.destroyed).toBe(true);
  });

  it('sanitizes and retries a source read failure without trusting an early verdict', async () => {
    const { gateway } = setup();
    const source = new Readable({
      read() {
        this.destroy(new Error('private-content secret-token-sentinel file.xml'));
      },
    });
    const error: unknown = await gateway.scanStream(source, content.length).catch((failure: unknown) => failure);
    expect(error).toMatchObject({ code: 'SCANNER_SOURCE_FAILED', retryable: true, failure: { sha256: null } });
    expect(error).not.toHaveProperty('cause');
    expect(String(error)).not.toMatch(/private-content|secret-token-sentinel|file\.xml/);
  });

  describe('real HTTP transport', () => {
    let server: Server;
    let url: string;
    let handle: RequestListener;
    beforeEach(async () => {
      server = createServer((req, res) => {
        req.on('error', () => {});
        handle(req, res);
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected TCP listener');
      }
      url = `http://127.0.0.1:${address.port}/scan`;
    });
    afterEach(async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    });

    it('streams a large lazily generated object and checks the remote digest', async () => {
      const chunk = Buffer.alloc(64 * 1024, 65);
      const count = 128;
      const hash = createHash('sha256');
      for (let i = 0; i < count; i++) {
        hash.update(chunk);
      }
      const sha256 = hash.digest('hex');
      let received = 0;
      handle = (req, res) => {
        const remoteHash = createHash('sha256');
        expect(req.headers['content-length']).toBe(String(chunk.length * count));
        expect(req.headers['content-disposition']).toBeUndefined();
        req.on('data', (data: Buffer) => {
          received += data.length;
          remoteHash.update(data);
        });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ...clean, sha256: remoteHash.digest('hex') }));
        });
      };
      const source = Readable.from(
        (function* () {
          for (let i = 0; i < count; i++) {
            yield chunk;
          }
        })(),
      );
      const gateway = new HttpAntivirusGateway({ ...config, url, timeoutMs: 5000 });
      await expect(gateway.scanStream(source, chunk.length * count)).resolves.toMatchObject({
        verdict: 'clean',
        sha256,
      });
      expect(received).toBe(chunk.length * count);
    });

    it('stops reading S3 when the scanner rejects an upload before consuming it', async () => {
      handle = (_req, res) => {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ verdict: 'error', errorCode: 'BUSY', retryable: true }));
      };
      let produced = 0;
      const chunk = Buffer.alloc(64 * 1024);
      const size = MAX_DEPOT_FILE_SIZE_BYTES;
      const source = new Readable({
        read() {
          if (produced >= size) {
            this.push(null);
            return;
          }
          produced += chunk.length;
          this.push(chunk);
        },
      });
      const gateway = new HttpAntivirusGateway({ ...config, url });
      await expect(gateway.scanStream(source, size)).rejects.toMatchObject({ code: 'BUSY', retryable: true });
      expect(source.destroyed).toBe(true);
      expect(produced).toBeLessThan(size);
    });
  });
});
