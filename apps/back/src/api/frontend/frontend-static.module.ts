import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';

/**
 * Les fichiers statiques sont servis par le serveur NestJS de façon temporaire.
 */

const FRONT_DIST_PATH = join(process.cwd(), 'apps', 'front', 'dist');

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: FRONT_DIST_PATH,
      renderPath: '/',
      exclude: ['/api/{*test}'],
    }),
  ],
})
export class FrontendStaticModule {}
