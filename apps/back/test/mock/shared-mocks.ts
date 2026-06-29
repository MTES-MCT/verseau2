/**
 * Shared mock classes for e2e tests.
 * These mocks provide full-featured implementations with call tracking,
 * failure simulation, and state reset capabilities.
 */

import type { S3 } from '@infra/s3/s3';
import type { Sftp } from '@infra/sftp/sftp';
import type { Queue, QueueJob, QueueOptions } from '@infra/queue/queue';
import type { UserEntity } from '@user/user.entity';
// ============= Infrastructure Mocks =============

/**
 * In-memory S3 mock that stores uploaded files and tracks operations.
 * Implements the S3 interface for full compatibility.
 */
export class S3TestMock implements S3 {
  private files: Map<string, Buffer> = new Map();
  uploads: Array<{ key: string; body: Buffer | Uint8Array | string; contentType?: string }> = [];

  async upload(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void> {
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
    this.files.set(key, buffer);
    this.uploads.push({ key, body, contentType });
    await Promise.resolve();
  }

  async download(key: string): Promise<Buffer> {
    const file = this.files.get(key);
    if (!file) {
      throw new Error(`File not found in S3Mock: ${key}`);
    }
    await Promise.resolve();
    return file;
  }

  /**
   * Pre-populate a file in the mock S3 storage.
   * Useful for setting up test fixtures.
   */
  seed(key: string, content: string | Buffer): void {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    this.files.set(key, buffer);
  }

  /**
   * Reset all state for clean test isolation.
   */
  reset(): void {
    this.files.clear();
    this.uploads = [];
  }

  /**
   * Check if a file exists in the mock storage.
   */
  hasFile(key: string): boolean {
    return this.files.has(key);
  }

  /**
   * Get the content of a stored file.
   */
  getFile(key: string): Buffer | undefined {
    return this.files.get(key);
  }
}

/**
 * SFTP mock that tracks calls and supports failure simulation.
 * Implements the Sftp interface for full compatibility.
 */
export class SftpTestMock implements Sftp {
  calls: Array<{ file: Buffer; fileName: string }> = [];
  shouldFail = false;
  failureMessage = 'SFTP send failed';

  async send(file: Buffer, fileName: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }
    this.calls.push({ file, fileName });
    await Promise.resolve();
  }

  async sendToAgentVerseau(file: Buffer, fileName: string): Promise<void> {
    await this.send(file, fileName);
  }

  /**
   * Reset all state for clean test isolation.
   */
  reset(): void {
    this.calls = [];
    this.shouldFail = false;
    this.failureMessage = 'SFTP send failed';
  }

  /**
   * Configure the mock to fail on next call.
   */
  setFailure(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail;
    if (message) {
      this.failureMessage = message;
    }
  }
}

/**
 * Queue mock that tracks sent jobs and allows waiting for job dispatch.
 * Implements the Queue interface for full compatibility.
 */
export class QueueTestMock implements Queue {
  jobs: Array<{ name: string; data: object }> = [];
  private resolvers: Array<() => void> = [];
  shouldFail = false;
  failureMessage = 'Queue send failed';

  async send<TData = object>(name: string, data?: TData): Promise<string | null> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }
    this.jobs.push({ name, data: data as object });
    // Notify any waiters
    this.resolvers.forEach((resolve) => resolve());
    this.resolvers = [];
    await Promise.resolve();
    return `mock-job-${Date.now()}`;
  }

  async work<TData = object>(
    _name: string,
    _options: QueueOptions,
    _handler: (job: QueueJob<TData>[]) => Promise<unknown>,
  ): Promise<string> {
    void _name;
    void _options;
    void _handler;
    await Promise.resolve();
    return 'mock-worker-id';
  }

  /**
   * Wait for at least one job to be sent.
   * Useful for testing async operations that enqueue jobs.
   */
  waitForJob(timeoutMs: number = 5000): Promise<void> {
    if (this.jobs.length > 0) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for queue job'));
      }, timeoutMs);

      this.resolvers.push(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  /**
   * Alias for waitForJob for backward compatibility.
   */
  waitForSend(timeoutMs: number = 5000): Promise<void> {
    return this.waitForJob(timeoutMs);
  }

  /**
   * Reset all state for clean test isolation.
   */
  reset(): void {
    this.jobs = [];
    this.resolvers = [];
    this.shouldFail = false;
    this.failureMessage = 'Queue send failed';
  }

  /**
   * Get all jobs by name.
   */
  getJobsByName(name: string): Array<{ name: string; data: object }> {
    return this.jobs.filter((job) => job.name === name);
  }

  /**
   * Configure the mock to fail on next send.
   */
  setFailure(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail;
    if (message) {
      this.failureMessage = message;
    }
  }
}

// ============= Gateway Mocks =============

/**
 * Mock for RoseauGateway.
 */
export class RoseauGatewayTestMock {
  findSteuBySandreCda = jest.fn().mockResolvedValue(null);
  findCxnAdmBySteuAndItv = jest.fn().mockResolvedValue(null);
  findChargeEntranteMaxComparisonBatch = jest.fn().mockResolvedValue([]);

  reset(): void {
    this.findSteuBySandreCda.mockClear().mockResolvedValue(null);
    this.findCxnAdmBySteuAndItv.mockClear().mockResolvedValue(null);
    this.findChargeEntranteMaxComparisonBatch.mockClear().mockResolvedValue([]);
  }
}

/**
 * Mock for LanceleauGateway.
 */
export class LanceleauGatewayTestMock {
  findIntervenantById = jest.fn().mockResolvedValue(null);

  reset(): void {
    this.findIntervenantById.mockClear().mockResolvedValue(null);
  }
}

// ============= Service Mocks =============

/**
 * Mock for UserService.
 */
export class UserServiceTestMock {
  private mockUser: Partial<UserEntity> = {
    id: 'user_123',
    sub: 'test-user-id',
    email: 'dev@example.com',
    nom: 'Test',
    prenom: 'User',
  };

  findById = jest.fn().mockImplementation(() => Promise.resolve(this.mockUser));

  findBySub = jest.fn().mockImplementation((sub: string) =>
    Promise.resolve({
      ...this.mockUser,
      sub,
      depots: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserEntity),
  );

  /**
   * Configure the mock user returned by find methods.
   */
  setMockUser(user: Partial<UserEntity>): void {
    this.mockUser = { ...this.mockUser, ...user };
  }

  reset(): void {
    this.mockUser = {
      id: 'user_123',
      sub: 'test-user-id',
      email: 'dev@example.com',
      nom: 'Test',
      prenom: 'User',
    };
    this.findById.mockClear();
    this.findBySub.mockClear();
  }
}

/**
 * Mock for DroitsDepotService.
 */
export class DroitsDepotServiceTestMock {
  validateDroits = jest.fn().mockResolvedValue(undefined);

  reset(): void {
    this.validateDroits.mockClear().mockResolvedValue(undefined);
  }
}

/**
 * Mock for DroitsUserService.
 */
export class DroitsUserServiceTestMock {
  private mockItvCdn: number | null = 100;

  resolveItvCdn = jest.fn().mockImplementation(() => Promise.resolve(this.mockItvCdn));

  /**
   * Configure the ITV CDN value returned by resolveItvCdn.
   */
  setMockItvCdn(itvCdn: number | null): void {
    this.mockItvCdn = itvCdn;
    this.resolveItvCdn.mockImplementation(() => Promise.resolve(this.mockItvCdn));
  }

  reset(): void {
    this.mockItvCdn = 100;
    this.resolveItvCdn.mockClear().mockImplementation(() => Promise.resolve(this.mockItvCdn));
  }
}

/**
 * Mock for ControleV1Service.
 */
export class ControleV1TestMock {
  async execute() {
    await Promise.resolve();
    return [];
  }
}

/**
 * Mock for ConfigService (NestJS).
 * Provides common configuration values for tests.
 */
export class ConfigServiceTestMock {
  private configValues: Record<string, string | null> = {};

  constructor(additionalValues?: Record<string, string>) {
    this.configValues = {
      DDL_SYNC: 'true',
      FAKE_TOKEN_STORAGE_KEY: 'test-token',
      S3_PROVIDER: 'mock',
      SFTP_PROVIDER: 'mock',
      S3_BUCKET: 'test-bucket',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'minio',
      S3_SECRET_KEY: 'minio123',
      SFTP_HOST: 'localhost',
      SFTP_PORT: '22',
      SFTP_USERNAME: 'user',
      SFTP_PRIVATE_KEY: 'key',
      SFTP_AGENCY_CONFIG: '{}',
      OIDC_MOCK: 'true',
      OIDC_MOCK_EMAIL: 'dev@example.com',
      OIDC_ISSUER_URL: 'https://mock-issuer',
      OIDC_CLIENT_ID: 'mock-client',
      OIDC_CLIENT_SECRET: 'mock-secret',
      OIDC_REDIRECT_URI: 'http://mock-redirect',
      USE_SANDRE_MOCK: 'true',
      JWT_SECRET: 'unsupersecret',
      NODE_ENV: 'development',
      ...additionalValues,
    };
  }

  get(key: string): string | null {
    return this.configValues[key] ?? null;
  }

  getOrThrow(key: string): string {
    const val = this.get(key);
    if (val === null) {
      throw new Error(`Config key ${key} missing`);
    }
    return val;
  }

  /**
   * Set a configuration value dynamically.
   */
  set(key: string, value: string | null): void {
    this.configValues[key] = value;
  }

  /**
   * Reset to default configuration values.
   */
  reset(): void {
    this.configValues = {
      DDL_SYNC: 'true',
      FAKE_TOKEN_STORAGE_KEY: 'test-token',
      S3_PROVIDER: 'mock',
      SFTP_PROVIDER: 'mock',
      S3_BUCKET: 'test-bucket',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'minio',
      S3_SECRET_KEY: 'minio123',
      SFTP_HOST: 'localhost',
      SFTP_PORT: '22',
      SFTP_USERNAME: 'user',
      SFTP_PRIVATE_KEY: 'key',
      SFTP_AGENCY_CONFIG: '{}',
      OIDC_MOCK: 'true',
      OIDC_MOCK_EMAIL: 'dev@example.com',
      OIDC_ISSUER_URL: 'https://mock-issuer',
      OIDC_CLIENT_ID: 'mock-client',
      OIDC_CLIENT_SECRET: 'mock-secret',
      OIDC_REDIRECT_URI: 'http://mock-redirect',
      USE_SANDRE_MOCK: 'true',
    };
  }
}

/**
 * Mock for NotificationGateway.
 */
export class NotificationGatewayTestMock {
  sendEmail = jest.fn().mockResolvedValue(undefined);

  reset(): void {
    this.sendEmail.mockClear().mockResolvedValue(undefined);
  }
}

/**
 * Mock for MasaGateway.
 */
export class MasaGatewayTestMock {
  findById = jest.fn().mockResolvedValue(null);

  reset(): void {
    this.findById.mockClear().mockResolvedValue(null);
  }
}

/**
 * Mock for ControleGateway.
 */
export class ControleGatewayTestMock {
  findControlesV2ByDepotId = jest.fn().mockResolvedValue([]);

  reset(): void {
    this.findControlesV2ByDepotId.mockClear().mockResolvedValue([]);
  }
}

/**
 * Mock for SftpAgency.
 */
export class SftpAgencyTestMock {
  private mockClient: jest.Mocked<any>;

  constructor() {
    this.mockClient = {
      send: jest.fn().mockResolvedValue(undefined),
      sendToAgentVerseau: jest.fn().mockResolvedValue(undefined),
    };
  }

  getClient(_agenceEauSiret: string): jest.Mocked<any> {
    return this.mockClient;
  }

  hasClient(_agenceEauSiret: string): boolean {
    return true;
  }

  getConfiguredAgencies(): string[] {
    return ['11111111111111', '22222222222222', '33333333333333'];
  }

  reset(): void {
    this.mockClient.send.mockClear();
    this.mockClient.sendToAgentVerseau.mockClear();
  }
}

/**
 * Mock for MasaProvider.
 */
export class MasaProviderTestMock {
  findAgenceEauSiretBySteuCode = jest.fn().mockResolvedValue('11111111111111');
  findAgenceEauNomBySteuCode = jest.fn().mockResolvedValue('11111111111111');

  reset(): void {
    this.findAgenceEauSiretBySteuCode.mockClear().mockResolvedValue('11111111111111');
    this.findAgenceEauNomBySteuCode.mockClear().mockResolvedValue('11111111111111');
  }
}
