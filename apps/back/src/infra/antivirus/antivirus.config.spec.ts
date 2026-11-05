import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { validateEnv } from '../config/env.validation';
import { isAntivirusBypassed, resolveAntivirusConfig } from './antivirus.config';
import { AntivirusGateway } from './antivirus.gateway';
import { AntivirusModule, createAntivirusGateway } from './antivirus.module';
import { MockAntivirusGateway } from './antivirus.mock';
import { antivirusScanResponseSchema } from '@lib/dossier';

describe('Antivirus configuration and DI', () => {
  const host =
    'antivirus.ap-a71da13f-7c70-4c00-a644-eee8558d8053.pn-ad0fd6a1-d05e-40ea-bf63-c4f8a75a9d8c.private-network.internal';
  const env = {
    NODE_ENV: 'production',
    JWT_SECRET: 'test-jwt-secret-32-characters-long-value',
    ANTIVIRUS_URL: `http://${host}:3011`,
    ANTIVIRUS_TOKEN: 'private-antivirus-token-32-characters-long',
  };

  it('accepts documented process-type DNS and an explicit fixed port', () => {
    expect(resolveAntivirusConfig(new ConfigService(env))).toEqual({
      url: `${env.ANTIVIRUS_URL}/scan`,
      token: env.ANTIVIRUS_TOKEN,
      timeoutMs: 150_000,
    });
    expect(validateEnv(env)).toBe(env);
    expect(resolveAntivirusConfig(new ConfigService({ ...env, ANTIVIRUS_URL: `http://${host}.:3011` })).url).toContain(
      'internal.:3011/scan',
    );
  });

  it.each([
    'http://scanner.example.com:3011',
    'http://10.240.0.4:3011',
    'http://127.0.0.1:3011',
    'http://[::1]:3011',
    `http://1.${host}:3011`,
    `http://${host.replace('antivirus.', '')}:3011`,
    `http://${host.replace('antivirus.', 'web.')}:3011`,
    `http://${host.replace('antivirus.', 'tcp.')}:3011`,
    `http://${host.replace('antivirus.', 'postdeploy.')}:3011`,
    `http://${host}`,
    `http://${host}:80`,
    `https://${host}:3011`,
    `http://user:password@${host}:3011`,
    `http://${host}:3011/scan`,
    `http://${host}:3011?token=private`,
    'not a URL',
  ])('fails closed for production endpoint %s', (url) => {
    expect(() => validateEnv({ ...env, ANTIVIRUS_URL: url })).toThrow();
  });

  it.each(['ANTIVIRUS_URL', 'ANTIVIRUS_TOKEN'])('requires production %s', (key) => {
    expect(() => validateEnv({ ...env, [key]: undefined })).toThrow();
    expect(() => createAntivirusGateway(new ConfigService({ ...env, [key]: undefined }))).toThrow();
  });

  it.each(['', 'short', 'token\nwith-newline-12345678901234567890', 'token with-space-12345678901234567890'])(
    'rejects unsafe bearer token',
    (token) => {
      expect(() => validateEnv({ ...env, ANTIVIRUS_TOKEN: token })).toThrow();
    },
  );

  it.each(['0', '-1', 'NaN', '1.5', '600001', '', '1e3'])('rejects invalid timeout %s', (timeout) => {
    expect(() => validateEnv({ ...env, ANTIVIRUS_TIMEOUT_MS: timeout })).toThrow();
  });

  it.each(['mock', 'disabled', 'clean'])('rejects unsupported provider %s', (provider) => {
    expect(() => validateEnv({ ...env, ANTIVIRUS_PROVIDER: provider })).toThrow();
    expect(() =>
      createAntivirusGateway(new ConfigService({ ...env, NODE_ENV: 'test', ANTIVIRUS_PROVIDER: provider })),
    ).toThrow();
  });

  it('only enables bypass for the explicit string true', () => {
    expect(isAntivirusBypassed(new ConfigService({}))).toBe(false);
    expect(isAntivirusBypassed(new ConfigService({ ANTIVIRUS_BYPASS: 'false' }))).toBe(false);
    expect(isAntivirusBypassed(new ConfigService({ ANTIVIRUS_BYPASS: 'true' }))).toBe(true);
    expect(() => validateEnv({ ...env, ANTIVIRUS_BYPASS: 'false', ANTIVIRUS_TOKEN: undefined })).toThrow();
  });

  it.each(['', '1', 'yes', 'TRUE', ' false ', true, false])('rejects ambiguous bypass value %s', (bypass) => {
    expect(() => validateEnv({ ...env, ANTIVIRUS_BYPASS: bypass })).toThrow('ANTIVIRUS_BYPASS');
    expect(() => createAntivirusGateway(new ConfigService({ ...env, ANTIVIRUS_BYPASS: bypass }))).toThrow(
      'ANTIVIRUS_BYPASS',
    );
  });

  it('allows an explicit production bypass without scanner settings, never returning fake clean evidence', async () => {
    const bypassEnv = { NODE_ENV: 'production', JWT_SECRET: env.JWT_SECRET, ANTIVIRUS_BYPASS: 'true' };
    expect(validateEnv(bypassEnv)).toBe(bypassEnv);
    const gateway = createAntivirusGateway(new ConfigService(bypassEnv));
    await expect(gateway.scan(Buffer.from('xml'))).rejects.toMatchObject({ code: 'SCANNER_BYPASSED' });
    expect(antivirusScanResponseSchema.safeParse({ verdict: 'ignored' }).success).toBe(false);
  });

  it('allows an unrelated nonproduction app to boot without ever approving a scan', async () => {
    const gateway = createAntivirusGateway(new ConfigService({ NODE_ENV: 'test' }));
    await expect(gateway.scan(Buffer.from('xml'))).rejects.toMatchObject({
      code: 'SCANNER_NOT_CONFIGURED',
      retryable: false,
    });
  });

  it('exposes the mockable token through the module without a configured real scanner', async () => {
    const module = await Test.createTestingModule({ imports: [AntivirusModule] })
      .overrideProvider(AntivirusGateway)
      .useClass(MockAntivirusGateway)
      .compile();
    const response = await module.get<AntivirusGateway>(AntivirusGateway).scan(Buffer.from('xml'));
    expect(response).toMatchObject({
      verdict: 'clean',
      engineVersion: 'mock',
      signatureVersion: '0',
    });
    expect(antivirusScanResponseSchema.safeParse(response).success).toBe(true);
    await module.close();
  });
});
