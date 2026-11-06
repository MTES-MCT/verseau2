import { createMock } from '@golevelup/ts-jest';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerConfigModule } from '@infra/throttler/throttler.module';
import { LoggerService } from '@shared/logger/logger.service';
import type { Express } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { MasaController } from './masa.controller';
import { MasaStatus, MasaWebhookStatus } from './masa.model';
import { MasaService } from './masa.service';
import { MasaApiKeyGuard } from './masaApiKey.guard';
import { MasaIpGuard } from './masaIp.guard';

describe('MasaController throttling', () => {
  let app: INestApplication<App>;
  const masaService = createMock<MasaService>();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerConfigModule],
      controllers: [MasaController],
      providers: [
        { provide: MasaService, useValue: masaService },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    })
      .overrideGuard(MasaApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(MasaIpGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication({ logger: false });
    (app.getHttpAdapter().getInstance() as Express).set('trust proxy', true);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('shares a 60 requests per minute limit across IP addresses', async () => {
    const processRetour = jest.spyOn(masaService, 'processRetourAgentVerseau').mockResolvedValue({
      id: 'masa-id',
      depotId: 'dep_test_001',
      numeroDepotVerseau1: null,
      statut: MasaStatus.INTEGRE,
      statutMasa: MasaWebhookStatus.INTEGRE,
      rapport: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const payload = {
      verseau2DepotId: 'dep_test_001',
      numeroDepotVerseau1: null,
      statut: MasaWebhookStatus.INTEGRE,
      rapport: 'test',
    };

    for (let i = 0; i < 60; i++) {
      await request(app.getHttpServer())
        .post('/webhook/masa/agent-verseau')
        .set('X-Forwarded-For', i % 2 === 0 ? '192.0.2.1' : '192.0.2.2')
        .send(payload)
        .expect(200)
        .expect('X-RateLimit-Limit', '60')
        .expect('X-RateLimit-Remaining', String(59 - i));
    }

    await request(app.getHttpServer())
      .post('/webhook/masa/agent-verseau')
      .set('X-Forwarded-For', '192.0.2.3')
      .send(payload)
      .expect(429)
      .expect('Retry-After', /\d+/);
    expect(processRetour).toHaveBeenCalledTimes(60);
  });
});
