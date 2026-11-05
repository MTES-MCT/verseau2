/* eslint-disable @typescript-eslint/unbound-method */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DepotService } from './depot.service';
import { DepotController } from './depot.controller';
import { DepotAdminController } from './depotAdmin.controller';
import { DepotGateway } from './depot.gateway';
import { DepotUploadService } from './depotUpload.service';
import { DroitsDepotService } from './droitsDepot.service';
import { UserService } from '@user/user.service';
import { DroitsUserService } from '@user/droitsUser.service';
import { HasUserAccessToDepotGuard } from '@authentication/hasUserAccessToDepot.guard';
import { IsAdminGuard } from '@authentication/isAdmin.guard';
import { MeGuard } from '@authentication/me.guard';
import { S3 } from '@s3/s3';
import { LoggerService } from '@shared/logger/logger.service';
import { AntivirusStatus } from '@lib/dossier';
import { cleanAnalysis } from '../../../test/fixtures/antivirus';
import type { DepotModel } from './depot.model';

describe('user and admin original XML HTTP download gates', () => {
  const path = 'depots/dep_1/file.xml';
  const buffer = Buffer.from('<root/>');
  const depot = { id: 'dep_1', path, nomOriginalFichier: 'bilan.xml' } as DepotModel;
  const gateway = createMock<DepotGateway>();
  const s3 = createMock<S3>();
  let app: INestApplication<App>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [DepotController, DepotAdminController],
      providers: [
        DepotService,
        { provide: DepotGateway, useValue: gateway },
        { provide: S3, useValue: s3 },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: DepotUploadService, useValue: createMock<DepotUploadService>() },
        { provide: DroitsDepotService, useValue: createMock<DroitsDepotService>() },
        { provide: UserService, useValue: createMock<UserService>() },
        { provide: DroitsUserService, useValue: createMock<DroitsUserService>() },
      ],
    })
      .overrideGuard(HasUserAccessToDepotGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(IsAdminGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(MeGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(() => app?.close());
  beforeEach(() => {
    jest.clearAllMocks();
    s3.download.mockResolvedValue(buffer);
  });

  it.each([undefined, AntivirusStatus.PENDING, AntivirusStatus.INFECTED, AntivirusStatus.ERROR])(
    'both endpoints deny %s before S3 GET, regardless of authorization',
    async (status) => {
      gateway.findDepotById.mockResolvedValue({
        ...depot,
        antivirusAnalysis: status ? { ...cleanAnalysis(depot.id, path, buffer), status } : undefined,
      });
      for (const url of ['/depot/dep_1/xml', '/admin/depot/dep_1/xml']) {
        await request(app.getHttpServer()).get(url).expect(403);
      }
      expect(s3.download).not.toHaveBeenCalled();
    },
  );

  it('verified clean permits both attachment endpoints with no-store', async () => {
    gateway.findDepotById.mockResolvedValue({ ...depot, antivirusAnalysis: cleanAnalysis(depot.id, path, buffer) });
    for (const url of ['/depot/dep_1/xml', '/admin/depot/dep_1/xml']) {
      const response = await request(app.getHttpServer()).get(url).expect(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toBe(buffer.toString());
    }
  });

  it('uses the saved clean verdict without revalidating audit metadata or downloaded bytes', async () => {
    gateway.findDepotById.mockResolvedValue({
      ...depot,
      antivirusAnalysis: { ...cleanAnalysis(depot.id, path, buffer), sha256: null, engineVersion: null },
    });
    const downloaded = Buffer.from('<downloaded/>');
    s3.download.mockResolvedValue(downloaded);
    for (const url of ['/depot/dep_1/xml', '/admin/depot/dep_1/xml']) {
      const response = await request(app.getHttpServer()).get(url).expect(200);
      expect(response.text).toBe(downloaded.toString());
    }
  });
});
