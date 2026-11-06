/* eslint-disable @typescript-eslint/unbound-method */
import { createMock } from '@golevelup/ts-jest';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { S3Service } from './s3.service';

describe('S3Service.downloadStream', () => {
  function setup(size: number | undefined = 70) {
    const stream = new Readable({
      read() {
        throw new Error('Source must not be consumed by downloadStream');
      },
    });
    const client = createMock<S3Client>();
    client.send.mockResolvedValue({ Body: stream, ContentLength: size } as never);
    const service = new S3Service('bucket', client);
    return { stream, client, service };
  }

  it('returns the original unread SDK stream and content length', async () => {
    const s = setup();
    const signal = new AbortController().signal;
    await expect(s.service.downloadStream('processing/file.xml', signal)).resolves.toEqual({
      stream: s.stream,
      size: 70,
    });
    expect(s.client.send).toHaveBeenCalledWith(expect.any(GetObjectCommand), { abortSignal: signal });
    expect((s.client.send.mock.calls[0][0] as GetObjectCommand).input).toEqual({
      Bucket: 'bucket',
      Key: 'processing/file.xml',
    });
    expect(s.stream.readableLength).toBe(0);
    s.stream.destroy();
  });

  it.each([null, -1, Number.NaN, 1.5])('discards the stream on invalid content length %s', async (size) => {
    const s = setup();
    s.client.send.mockResolvedValue({ Body: s.stream, ContentLength: size } as never);
    await expect(s.service.downloadStream('key')).rejects.toThrow('content length');
    expect(s.stream.destroyed).toBe(true);
  });

  it('rejects missing content length without retaining the SDK stream', async () => {
    const s = setup();
    s.client.send.mockResolvedValue({ Body: s.stream } as never);
    await expect(s.service.downloadStream('key')).rejects.toThrow('content length');
    expect(s.stream.destroyed).toBe(true);
  });

  it('destroys an open SDK stream when its lease is cancelled', async () => {
    const s = setup();
    const controller = new AbortController();
    await s.service.downloadStream('key', controller.signal);
    const completion = finished(s.stream).catch((error: unknown) => error);
    controller.abort();
    await expect(completion).resolves.toMatchObject({ name: 'AbortError' });
    expect(s.stream.destroyed).toBe(true);
  });
});
