import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';
import { LoggerService } from '@shared/logger/logger.service';

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: new LoggerService('Bootstrap'),
  });

  // Enable Nest lifecycle hooks on shutdown signals (SIGTERM, SIGINT)
  app.enableShutdownHooks();

  await app.init();
}
bootstrapWorker();
