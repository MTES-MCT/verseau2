import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ApiModule } from './api/api.module';
import { MigrationService } from './infra/database/migration.service';
import cookieParser from 'cookie-parser';
import { LoggerService } from '@shared/logger/logger.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { createSecurityHeadersMiddleware, parseExtraConnectOrigins } from '@shared/security-headers/security-headers';

async function bootstrapServer() {
  const app = await NestFactory.create<NestExpressApplication>(ApiModule, {
    logger: new LoggerService('Bootstrap'),
  });
  const configService = app.get(ConfigService);

  // En-têtes de sécurité (CSP, HSTS, nosniff, frame-ancestors…) sur toutes les
  // réponses : API, SPA servi par ServeStatic et erreurs. Enregistré avant
  // listen() pour passer devant les middlewares ServeStatic ajoutés à l'init.
  app.use(
    createSecurityHeadersMiddleware({
      // Ex. hôte d'ingestion Sentry pour le SPA (CSP_EXTRA_CONNECT_SRC).
      extraConnectOrigins: parseExtraConnectOrigins(process.env.CSP_EXTRA_CONNECT_SRC),
      // Même configuration que les clients S3, y compris les valeurs chargées depuis .env.
      s3Endpoint: configService.get<string>('S3_ENDPOINT'),
      s3PublicEndpoint: configService.get<string>('S3_PUBLIC_ENDPOINT'),
    }),
  );

  if (process.env.DISABLE_INDEXING === 'true') {
    app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      next();
    });
  }

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
