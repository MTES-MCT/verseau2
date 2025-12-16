import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(WorkerModule);

  // Enable Nest lifecycle hooks on shutdown signals (SIGTERM, SIGINT)
  app.enableShutdownHooks();

  await app.init();
}
bootstrapWorker();
