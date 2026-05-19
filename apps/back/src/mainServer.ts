import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api/api.module';
import { MigrationService } from './infra/database/migration.service';
import cookieParser from 'cookie-parser';
import { LoggerService } from '@shared/logger/logger.service';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrapServer() {
  const app = await NestFactory.create<NestExpressApplication>(ApiModule, {
    logger: new LoggerService('Bootstrap'),
  });

  app.use(cookieParser());
  app.set('trust proxy', true);
  // Run migrations before starting the server (with advisory lock for multi-instance safety)
  const migrationService = app.get(MigrationService);
  try {
    await migrationService.runMigrationsIfEnabled();
  } catch (error) {
    console.error('Fatal: Migration failed on startup', error);
    process.exit(1);
  }

  // Enable Nest lifecycle hooks on shutdown signals (SIGTERM, SIGINT)
  app.enableShutdownHooks();
  if (process.env.CORS_ORIGIN) {
    app.enableCors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    });
  }
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrapServer();
