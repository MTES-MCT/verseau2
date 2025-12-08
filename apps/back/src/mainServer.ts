import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api/api.module';

async function bootstrapServer() {
  const app = await NestFactory.create(ApiModule);

  // Enable CORS for frontend development
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrapServer();
