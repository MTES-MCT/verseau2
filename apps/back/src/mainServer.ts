import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api/api.module';
import { MigrationService } from './infra/database/migration.service';

async function bootstrapServer() {
  const app = await NestFactory.create(ApiModule);

  // Run migrations before starting the server (with advisory lock for multi-instance safety)
  const migrationService = app.get(MigrationService);
  try {
    await migrationService.runMigrationsIfEnabled();
  } catch (error) {
    console.error('Fatal: Migration failed on startup', error);
    process.exit(1);
  }

  // Enable CORS for frontend development
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrapServer();
