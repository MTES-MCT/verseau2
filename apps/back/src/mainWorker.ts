import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';
import { LoggerService } from '@shared/logger/logger.service';

async function bootstrapWorker() {
  const logger = new LoggerService('Bootstrap');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger,
  });

  // Enable Nest lifecycle hooks on shutdown signals (SIGTERM, SIGINT)
  app.enableShutdownHooks();

  await app.init();
  logger.log('Worker application ready');
}
void bootstrapWorker();
