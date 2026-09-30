import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_XML_PARSE_BUDGETS } from '@lib/parser';
import { getDepotXmlParseBudgets } from '@lib/dossier';
import { HasUserAccessToDepotGuard } from '@authentication/hasUserAccessToDepot.guard';
import { LoggerService } from '@shared/logger/logger.service';
import { UserService } from '@user/user.service';
import { DroitsUserService } from '@user/droitsUser.service';
import type { CustomRequest } from '@shared/constants/customRequest';
import { DepotController } from './depot.controller';
import { DepotService } from './depot.service';
import { DepotUploadService } from './depotUpload.service';
import { DroitsDepotService } from './droitsDepot.service';

describe('DepotController XML parse policy', () => {
  let app: INestApplication<App>;
  let authenticated: boolean;
  let config: ConfigService;

  beforeEach(async () => {
    authenticated = true;
    config = new ConfigService({
      XML_PARSE_MAX_ELEMENTS: '2500000',
      XML_PARSE_MAX_DEPTH: '2',
    });
    const module = await Test.createTestingModule({
      controllers: [DepotController],
      providers: [
        { provide: DepotService, useValue: {} },
        { provide: DepotUploadService, useValue: {} },
        { provide: DroitsDepotService, useValue: {} },
        { provide: UserService, useValue: {} },
        { provide: DroitsUserService, useValue: {} },
        { provide: LoggerService, useValue: { setContext: jest.fn() } },
        { provide: ConfigService, useValue: config },
      ],
    })
      .overrideGuard(HasUserAccessToDepotGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication({ logger: false });
    app.use((req: CustomRequest, _res: unknown, next: () => void) => {
      if (authenticated) {
        req.user = {} as CustomRequest['user'];
      }
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns effective raised/lowered limits with defaults for unspecified budgets', async () => {
    const response = await request(app.getHttpServer()).get(getDepotXmlParseBudgets.path).expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(getDepotXmlParseBudgets.response.parse(response.body)).toEqual({
      ...DEFAULT_XML_PARSE_BUDGETS,
      maxElements: 2_500_000,
      maxDepth: 2,
    });
  });

  it('requires authentication to retrieve the policy', async () => {
    authenticated = false;
    await request(app.getHttpServer()).get(getDepotXmlParseBudgets.path).expect(401);
  });
});
