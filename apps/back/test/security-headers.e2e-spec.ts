import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.join(__dirname, 'test.envfile'),
  override: true,
});

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { ApiModule } from '../src/api/api.module';
import { PGBOSS } from '../src/infra/queue/queue';
import { InfraModule } from '@infra/infra.module';
import { initTestContainerImports } from './init/initTestContainer';
import { getPostgresConnectionUri, startPostgresContainer } from './testcontainer.config';
import { InfraMockModule } from './mock/infraMock.module';
import { LoggerService } from '@shared/logger/logger.service';
import { loggerValueMock } from '@shared/logger/logger.mock';
import { ThrottlerConfigModule } from '@infra/throttler/throttler.module';
import { createSecurityHeadersMiddleware } from '@shared/security-headers/security-headers';

const HSTS_VALUE = 'max-age=31536000; includeSubDomains';
const API_CSP = "default-src 'none'; frame-ancestors 'none'";

describe('Security headers (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await startPostgresContainer();
    const connectionUri = getPostgresConnectionUri();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...initTestContainerImports(connectionUri), ApiModule, ThrottlerConfigModule],
    })
      .overrideModule(InfraModule)
      .useModule(InfraMockModule)
      .overrideProvider(PGBOSS)
      .useValue(null)
      .overrideProvider(LoggerService)
      .useValue(loggerValueMock)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    // Même composition que mainServer.ts (middleware de sécurité puis cookieParser
    // et préfixe global avant init).
    app.use(createSecurityHeadersMiddleware());
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/version (GET) - applique les en-têtes de sécurité communs', async () => {
    await request(app.getHttpServer())
      .get('/api/version')
      .expect(401)
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('X-Frame-Options', 'DENY')
      .expect('Referrer-Policy', 'strict-origin-when-cross-origin')
      .expect('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  });

  it('/api/version (GET) - applique la CSP restrictive des réponses API', async () => {
    await request(app.getHttpServer()).get('/api/version').expect(401).expect('Content-Security-Policy', API_CSP);
  });

  it('/api/version (GET) - n’envoie pas HSTS sur une requête HTTP', async () => {
    const response = await request(app.getHttpServer()).get('/api/version').expect(401);
    expect(response.headers['strict-transport-security']).toBeUndefined();
  });

  it('/api/version (GET) - envoie HSTS quand x-forwarded-proto vaut https', async () => {
    await request(app.getHttpServer())
      .get('/api/version')
      .set('x-forwarded-proto', 'https')
      .expect(401)
      .expect('Strict-Transport-Security', HSTS_VALUE);
  });

  // Les réponses du SPA servies par ServeStatic (fichiers statiques et fallback
  // index.html) sont couvertes par la spec unitaire security-headers.spec.ts, qui
  // boote l'app via NestFactory.create comme en production : dans le flux de test
  // (Test.createTestingModule), les providers de ServeStaticModule sont instanciés
  // avant le rattachement de l'adapter HTTP et le loader retombe sur NoopLoader.
});
