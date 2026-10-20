/* eslint-disable @typescript-eslint/unbound-method */
import axios, { AxiosInstance, type AxiosRequestConfig } from 'axios';
import type FormData from 'form-data';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@shared/logger/logger.service';
import { SharedModule } from '@shared/shared.module';
import { SandreService, SandreTaskFailedError } from './sandre.service';

describe('SandreService injection', () => {
  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [SandreService],
    }).compile();

    expect(module.get<SandreService>(SandreService)).toBeDefined();
  });
});

describe('SandreService native contract', () => {
  const env = { ...process.env };
  const logger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  } as unknown as LoggerService;
  const http = {
    post: jest.fn<Promise<unknown>, [string, FormData, AxiosRequestConfig]>(),
    get: jest.fn(),
  };
  const reference = { sessionId: 'session-1', taskId: 'task-1' };
  let service: SandreService;
  const receipt = (acceptation = '1', erreur?: unknown) => ({
    ACQ: {
      AccuseReception: {
        Acceptation: acceptation,
        Jeton: 'opaque-acq-identifier',
        CodeScenario: 'FCT_ASSAIN',
        VersionScenario: '4',
        ...(erreur ? { Erreur: erreur } : {}),
      },
    },
  });
  const done = () => ({
    status: 200,
    data: {
      taskId: reference.taskId,
      status: 'DONE',
      scenarioCode: 'FCT_ASSAIN',
      scenarioVersion: '4',
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    http.get.mockReset();
    http.post.mockReset();
    delete process.env.SANDRE_API_URL;
    jest.spyOn(axios, 'create').mockReturnValue(http as unknown as AxiosInstance);
    service = new SandreService(logger);
  });
  afterEach(() => {
    process.env = { ...env };
    jest.restoreAllMocks();
  });

  it('disables redirects and bounds requests/responses', () => {
    expect(axios.create).toHaveBeenCalledWith({
      timeout: 30000,
      maxRedirects: 0,
      maxBodyLength: 75 * 1024 * 1024,
      maxContentLength: 20 * 1024 * 1024,
    });
  });

  it.each([200, 202])('posts the multipart file with RGPD consent and accepts upload HTTP %s', async (status) => {
    http.post.mockResolvedValue({
      status,
      data: {
        sessionId: reference.sessionId,
        taskId: reference.taskId,
        url: 'https://evil.example/parseur/parseur',
      },
    });
    await expect(service.validateFile({ xml: Buffer.from('<xml/>') })).resolves.toEqual(reference);
    const [url, form, options] = http.post.mock.calls[0];
    expect(url).toBe('https://www.sandre.eaufrance.fr/parseur/api/v1/upload-and-validate');
    expect(options).toEqual(expect.objectContaining({ responseType: 'json', params: { rgpdConsent: true } }));
    const body = form.getBuffer().toString();
    expect(body).toContain('name="file"');
    expect(body).not.toMatch(/name="(XML|XSD|NomSI|VersionSI)"/);
  });

  it.each([
    {},
    { sessionId: 's' },
    { taskId: 't' },
    { sessionId: 's', taskId: '' },
    { sessionId: 's', taskId: '../other' },
    { sessionId: '../other', taskId: 't' },
    { sessionId: 's', taskId: ['t'] },
    { sessionId: 's', taskIds: ['t'] },
    { sessionId: 's', taskIds: [] },
    { sessionId: 's', taskIds: ['a', 'b'] },
    { sessionId: 's', taskIds: ['../other'] },
    { token: { jeton: 'legacy' } },
  ])('rejects malformed upload task references: %j', async (data) => {
    http.post.mockResolvedValue({ status: 202, data });
    await expect(service.validateFile({ xml: Buffer.from('<xml/>') })).rejects.toThrow();
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it.each([400, 413, 429, 500, 'timeout'])('propagates upload failure %s to the worker', async (status) => {
    http.post.mockRejectedValue(new Error(String(status)));
    await expect(service.validateFile({ xml: Buffer.from('<xml/>') })).rejects.toThrow(String(status));
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('logs the HTTP status and JSON response without request data, and rethrows the original error', async () => {
    const data = { error: 'Invalid request', message: 'Missing required parameter' };
    const error = Object.assign(new Error('Bad Request'), {
      isAxiosError: true,
      response: { status: 400, data, headers: { 'set-cookie': 'private-cookie' } },
      config: { data: '<private-xml/>', headers: { Authorization: 'private-token' } },
    });
    http.post.mockRejectedValue(error);

    await expect(service.validateFile({ xml: Buffer.from('<private-xml/>') })).rejects.toBe(error);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('SANDRE upload rejected', {
      statusCode: 400,
      responseBody: JSON.stringify(data),
      responseBodyTruncated: false,
    });
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it.each(['<html>Bad gateway</html>', 'x'.repeat(5000)])('logs bounded non-JSON error responses', async (body) => {
    const error = Object.assign(new Error('Bad Gateway'), {
      isAxiosError: true,
      response: { status: 502, data: body },
    });
    http.post.mockRejectedValue(error);

    await expect(service.validateFile({ xml: Buffer.from('<xml/>') })).rejects.toBe(error);

    expect(logger.error).toHaveBeenCalledWith('SANDRE upload rejected', {
      statusCode: 502,
      responseBody: body.slice(0, 4096),
      responseBodyTruncated: body.length > 4096,
    });
  });

  it('preserves transport errors without inventing a response body', async () => {
    const error = Object.assign(new Error('Timeout'), { isAxiosError: true });
    http.post.mockRejectedValue(error);

    await expect(service.validateFile({ xml: Buffer.from('<xml/>') })).rejects.toBe(error);

    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'RUNNING'])('continues 202/%s without requesting ACQ', async (status) => {
    http.get.mockResolvedValue({ status: 202, data: { taskId: reference.taskId, status } });
    await expect(service.getValidationResult(reference)).resolves.toBeNull();
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it.each([
    [422, 'FAILED'],
    [200, 'RUNNING'],
    [202, 'DONE'],
    [200, 'UNKNOWN'],
  ])('rejects technical/inconsistent task %s/%s', async (status, state) => {
    http.get.mockResolvedValue({ status, data: { taskId: reference.taskId, status: state } });
    await expect(service.getValidationResult(reference)).rejects.toThrow();
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('identifies a terminal FAILED task so the worker can stop polling', async () => {
    http.get.mockResolvedValue({ status: 422, data: { taskId: reference.taskId, status: 'FAILED' } });
    await expect(service.getValidationResult(reference)).rejects.toBeInstanceOf(SandreTaskFailedError);
  });

  it('rejects mismatched task identifiers', async () => {
    http.get.mockResolvedValue({ status: 202, data: { taskId: 'other', status: 'PENDING' } });
    await expect(service.getValidationResult(reference)).rejects.toThrow('identifier mismatch');
  });

  it.each(['1', '2'])('fetches final ACQ %s and preserves warnings, locations and metadata', async (status) => {
    const error = {
      CdErreur: 'W01',
      DescriptifErreur: 'Warning',
      LocationErreur: '/x',
      LigneErreur: '10',
      ColonneErreur: '2',
      '@attributes': { SeveriteErreur: 'AVERTISSEMENT' },
    };
    const acq = receipt(status, [error, { Erreur: error }]);
    const task = done();
    http.get.mockResolvedValueOnce(task).mockResolvedValueOnce({ status: 200, data: acq });
    await expect(service.getValidationResult(reference)).resolves.toEqual(acq);
    expect(http.get).toHaveBeenLastCalledWith(
      'https://www.sandre.eaufrance.fr/parseur/api/v1/acquittement/task-1/json',
      expect.anything(),
    );
  });

  it.each([{}, receipt('0'), receipt('99'), receipt('2', [{ CdErreur: 'bad' }])])(
    'rejects malformed/non-final ACQ',
    async (data) => {
      http.get.mockResolvedValueOnce(done()).mockResolvedValueOnce({ status: 200, data });
      await expect(service.getValidationResult(reference)).rejects.toThrow();
    },
  );

  it('uses a configured native base for all locally constructed URLs', async () => {
    process.env.SANDRE_API_URL = 'https://sandre.example.org/custom/';
    service = new SandreService(logger);
    http.get.mockResolvedValue({ status: 202, data: { taskId: reference.taskId, status: 'RUNNING' } });
    await service.getValidationResult(reference);
    expect(http.get).toHaveBeenCalledWith(
      'https://sandre.example.org/custom/api/v1/validation/tasks/task-1',
      expect.anything(),
    );
  });

  it.each(['http://example.org', 'https://user:pass@example.org', 'https://example.org?x=1'])(
    'rejects unsafe base %s',
    (url) => {
      process.env.SANDRE_API_URL = url;
      expect(() => new SandreService(logger)).toThrow();
    },
  );

  it('drains existing jeton jobs using only the legacy GET', async () => {
    const data = receipt();
    data.ACQ.AccuseReception.Jeton = 'old-token';
    http.get.mockResolvedValue({ data });
    await expect(service.getLegacyValidationResult('old-token')).resolves.toEqual(data);
    expect(http.get).toHaveBeenCalledWith(
      'https://www.sandre.eaufrance.fr/PS5/api/acquittement/old-token',
      expect.anything(),
    );
    expect(http.post).not.toHaveBeenCalled();
  });

  it('rejects a mismatched legacy acquittement token', async () => {
    http.get.mockResolvedValue({ data: receipt() });
    await expect(service.getLegacyValidationResult('old-token')).rejects.toThrow('token mismatch');
  });
});
