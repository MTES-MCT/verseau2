/**
 * InfraMockModule variant that does NOT mock the database.
 * Use this when you need real database operations with testcontainers.
 * The database connection comes from initTestContainerImports(connectionUri).
 *
 * Important: This module does NOT include S3MockModule or QueueMockModule
 * because they import DatabaseMockModule. Use .overrideProvider() in tests
 * to provide S3, AgentVerseauClient, and QueueGateway mocks.
 */
import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { AuthenticationModule } from '@authentication/authentication.module';
import { ConfigurationModule } from '@infra/config/configuration.module';
import { PGBOSS, QueueGateway } from '@infra/queue/queue';
import { S3 } from '@infra/s3/s3';
import { AgentVerseauClient } from '@infra/agentVerseauClient/agentVerseauClient';
import { AgenceEauClient } from '@infra/agenceEauClient/agenceEauClient';

// Minimal placeholder providers - tests should override these
const minimalQueueProvider = {
  provide: QueueGateway,
  useValue: { send: jest.fn(), work: jest.fn() },
};

const minimalS3Provider = {
  provide: S3,
  useValue: { upload: jest.fn(), download: jest.fn() },
};

const minimalAgentVerseauClientProvider = {
  provide: AgentVerseauClient,
  useValue: { send: jest.fn() },
};

const minimalAgenceEauClientProvider = {
  provide: AgenceEauClient,
  useValue: {
    getClient: jest.fn(),
    hasClient: jest.fn(),
    getConfiguredAgencies: jest.fn().mockReturnValue([]),
  },
};

const pgBossNullProvider = {
  provide: PGBOSS,
  useValue: null,
};

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    AuthenticationModule,
    ConfigurationModule,
  ],
  providers: [
    minimalQueueProvider,
    minimalS3Provider,
    minimalAgentVerseauClientProvider,
    minimalAgenceEauClientProvider,
    pgBossNullProvider,
  ],
  exports: [
    ClsModule,
    AuthenticationModule,
    ConfigurationModule,
    QueueGateway,
    S3,
    AgentVerseauClient,
    AgenceEauClient,
    PGBOSS,
  ],
})
export class InfraWithRealDbMockModule {}
