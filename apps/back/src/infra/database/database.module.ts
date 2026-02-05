import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { LoggerService } from '@shared/logger/logger.service';
import { MigrationService } from './migration.service';
import { TypeOrmLogger } from './typeorm-logger';
import path from 'path';

const getDdlSync = (configService: ConfigService) => {
  const ddlSync = configService.get<string>('DDL_SYNC') === 'true';
  if (ddlSync) {
    new LoggerService('DatabaseModule').warn(`DDL_SYNC is ${ddlSync}`);
  }
  return ddlSync;
};

const getLogging = (configService: ConfigService) => {
  return configService.get<string>('DATABASE_LOGGING') === 'true';
};

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const migrationsPath = path.join(__dirname, '../migrations/**/*{.js, .ts}');
        const config: TypeOrmModuleOptions = {
          type: 'postgres',
          url: configService.getOrThrow('DATABASE_URL'),
          autoLoadEntities: true,
          synchronize: getDdlSync(configService),
          logging: getLogging(configService),
          logger: new TypeOrmLogger(),
          poolSize: 5, // TODO: à gérer selon l'environnement, web: PROCESS_TYPE=api node apps/back/dist/mainServer.js
          migrations: [migrationsPath],
        };
        return config;
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class DatabaseModule {}
