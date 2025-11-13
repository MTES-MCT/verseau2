import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';

export async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  await app.init();
}
