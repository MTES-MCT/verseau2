import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api/api.module';
import { MigrationService } from './infra/database/migration.service';
import cookieParser from 'cookie-parser';

async function bootstrapServer() {
  const app = await NestFactory.create(ApiModule);

  app.use(cookieParser());

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

  // Enable CORS for frontend development
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrapServer();
