import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { LoggerService } from '@shared/logger/logger.service';
import { MigrationService } from './migration.service';
import { resolveDatabasePoolSize } from './databasePoolSize';
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
        const poolSize = resolveDatabasePoolSize(configService);
        const processType = configService.get<string>('PROCESS_TYPE') ?? 'local';
        new LoggerService('DatabaseModule').log(`Database pool size for ${processType} is ${poolSize}`);
        const config: TypeOrmModuleOptions = {
          type: 'postgres',
          url: configService.getOrThrow('DATABASE_URL'),
          autoLoadEntities: true,
          synchronize: getDdlSync(configService),
          logging: getLogging(configService),
          logger: new TypeOrmLogger(),
          poolSize,
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
