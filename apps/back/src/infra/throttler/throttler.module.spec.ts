import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ThrottlerConfigModule } from './throttler.module';

@Controller()
class ThrottlerTestController {
  @Get('default')
  defaultLimit() {
    return 'ok';
  }

  @Get('limited')
  @Throttle({ default: { ttl: 60000, limit: 2 } })
  limited() {
    return 'ok';
  }

  @Get('skipped')
  @Throttle({ default: { ttl: 60000, limit: 1 } })
  @SkipThrottle()
  skipped() {
    return 'ok';
  }
}

describe('ThrottlerConfigModule (NestJS 12 compatibility)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerConfigModule],
      controllers: [ThrottlerTestController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = module.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('applies the configured default limit', async () => {
    await request(app.getHttpServer()).get('/default').expect(200).expect('X-RateLimit-Limit', '100');
  });

  it('returns 429 after the route-specific limit is exceeded', async () => {
    await request(app.getHttpServer()).get('/limited').expect(200).expect('X-RateLimit-Remaining', '1');
    await request(app.getHttpServer()).get('/limited').expect(200).expect('X-RateLimit-Remaining', '0');
    await request(app.getHttpServer()).get('/limited').expect(429).expect('Retry-After', /\d+/);
  });

  it('honors SkipThrottle even when a route-specific limit is set', async () => {
    await request(app.getHttpServer()).get('/skipped').expect(200);
    const response = await request(app.getHttpServer()).get('/skipped').expect(200);
    expect(response.headers['x-ratelimit-limit']).toBeUndefined();
  });
});
