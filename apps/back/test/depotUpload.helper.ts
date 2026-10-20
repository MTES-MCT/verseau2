import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { initializeDepotUpload, type RouteResponse } from '@lib/dossier';
import { S3TestMock } from './mock/shared-mocks';

export async function uploadTestDepot(
  app: INestApplication<App>,
  s3: S3TestMock,
  content: string,
  fileName: string,
): Promise<request.Response> {
  const response = await request(app.getHttpServer())
    .post('/depot/upload/init')
    .set('Cookie', ['access_token=test-token'])
    .send({ fileName, size: Buffer.byteLength(content), contentType: 'application/xml' })
    .expect(201);
  const session = response.body as RouteResponse<typeof initializeDepotUpload>;
  s3.seed(decodeURIComponent(new URL(session.uploadUrl).pathname.slice(1)), content);
  return request(app.getHttpServer())
    .post(`/depot/${session.depotId}/upload/complete`)
    .set('Cookie', ['access_token=test-token'])
    .expect(201);
}
