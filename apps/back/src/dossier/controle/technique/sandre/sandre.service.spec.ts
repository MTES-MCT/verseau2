/* eslint-disable @typescript-eslint/unbound-method */
import axios, { AxiosInstance } from 'axios';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@shared/logger/logger.service';
import { SharedModule } from '@shared/shared.module';
import { SandreService } from './sandre.service';

describe('SandreService injection', () => {
  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [SandreService],
    }).compile();

    expect(module.get<SandreService>(SandreService)).toBeDefined();
  });
});

describe('SandreService', () => {
  const originalSandreApiUrl = process.env.SANDRE_API_URL;
  const logger = { setContext: jest.fn(), log: jest.fn(), error: jest.fn() } as unknown as LoggerService;
  const httpClient = { post: jest.fn(), get: jest.fn() };
  let service: SandreService;

  beforeEach(() => {
    delete process.env.SANDRE_API_URL;
    jest.clearAllMocks();
    jest.spyOn(axios, 'create').mockReturnValue(httpClient as unknown as AxiosInstance);
    service = new SandreService(logger);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalSandreApiUrl === undefined) {
      delete process.env.SANDRE_API_URL;
    } else {
      process.env.SANDRE_API_URL = originalSandreApiUrl;
    }
  });

  it('disables redirects and bounds multipart uploads and responses', () => {
    expect(axios.create).toHaveBeenCalledWith({
      timeout: 30000,
      maxRedirects: 0,
      maxBodyLength: 75 * 1024 * 1024,
      maxContentLength: 20 * 1024 * 1024,
    });
  });

  it('uploads over HTTPS and rejects an invalid token response', async () => {
    httpClient.post.mockResolvedValue({
      data: { token: { jeton: '../other', lienAcquittement: '', lienCertificat: '' } },
    });
    await expect(
      service.validateFile({ xml: Buffer.from('<xml/>'), xsd: 'FCT_ASSAIN;4', nomSI: 'Verseau2', versionSI: '1' }),
    ).rejects.toThrow();
    expect(httpClient.post).toHaveBeenCalledWith(
      'https://www.sandre.eaufrance.fr/PS5/api/upload',
      expect.anything(),
      expect.objectContaining({ responseType: 'json' }),
    );
  });

  it('accepts a valid token response', async () => {
    const token = {
      jeton: 'abc_123',
      lienAcquittement: 'https://example.org/acq',
      lienCertificat: 'https://example.org/cert',
    };
    httpClient.post.mockResolvedValue({ data: { token } });
    await expect(
      service.validateFile({ xml: Buffer.from('<xml/>'), xsd: 'FCT_ASSAIN;4', nomSI: 'Verseau2', versionSI: '1' }),
    ).resolves.toEqual(token);
  });

  const acquittement = (status: string, error?: unknown) => ({
    ACQ: {
      Scenario: { CodeScenario: 'FCT_ASSAIN' },
      AccuseReception: {
        Acceptation: status,
        Jeton: 'abc_123',
        CodeScenario: 'FCT_ASSAIN',
        VersionScenario: '4',
        ...(error === undefined ? {} : { Erreur: error }),
      },
    },
  });

  it('uses SANDRE_API_URL for uploads and acquittement requests', async () => {
    process.env.SANDRE_API_URL = 'https://sandre.example.org/api';
    service = new SandreService(logger);
    httpClient.post.mockResolvedValue({
      data: { token: { jeton: 'abc_123', lienAcquittement: '', lienCertificat: '' } },
    });
    httpClient.get.mockResolvedValue({ data: acquittement('1') });

    await service.validateFile({ xml: Buffer.from('<xml/>'), xsd: 'FCT_ASSAIN;4', nomSI: 'Verseau2', versionSI: '1' });
    await service.getValidationResult('abc_123');

    expect(httpClient.post).toHaveBeenCalledWith(
      'https://sandre.example.org/api/upload',
      expect.anything(),
      expect.anything(),
    );
    expect(httpClient.get).toHaveBeenCalledWith(
      'https://sandre.example.org/api/acquittement/abc_123',
      expect.anything(),
    );
  });

  it('fetches acquittement over HTTPS and preserves validated response metadata', async () => {
    const data = acquittement('1');
    httpClient.get.mockResolvedValue({ data });
    await expect(service.getValidationResult('abc_123')).resolves.toEqual(data);
    expect(httpClient.get).toHaveBeenCalledWith(
      'https://www.sandre.eaufrance.fr/PS5/api/acquittement/abc_123',
      expect.objectContaining({ responseType: 'json' }),
    );
  });

  it.each(['0', '1', '2', '3'])('accepts known SANDRE status %s', async (status) => {
    const data = acquittement(status);
    httpClient.get.mockResolvedValue({ data });
    await expect(service.getValidationResult('abc_123')).resolves.toEqual(data);
  });

  it.each([
    ['missing ACQ', {}],
    ['unknown status', acquittement('99')],
    ['malformed error', acquittement('2', [{ CdErreur: 'E01' }])],
    ['wrong token', { ACQ: { AccuseReception: { ...acquittement('1').ACQ.AccuseReception, Jeton: 'other' } } }],
  ])('rejects %s before it can decide conformity', async (_description, data) => {
    httpClient.get.mockResolvedValue({ data });
    await expect(service.getValidationResult('abc_123')).rejects.toThrow();
  });

  it('accepts both simple and nested error lists from SANDRE', async () => {
    const error = { CdErreur: 'E01', DescriptifErreur: 'Invalid XML' };
    const data = acquittement('2', [error, { Erreur: error }]);
    httpClient.get.mockResolvedValue({ data });
    await expect(service.getValidationResult('abc_123')).resolves.toEqual(data);
  });
});
