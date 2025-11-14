import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api/api.module';

async function bootstrapServer() {
  const app = await NestFactory.create(ApiModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrapServer();
