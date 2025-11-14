import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrapServer() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrapServer();
