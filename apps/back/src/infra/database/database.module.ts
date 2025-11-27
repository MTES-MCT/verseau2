import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerService } from '@shared/logger/logger.service';

const getDdlSync = (configService: ConfigService) => {
  const ddlSync = configService.get<string>('DDL_SYNC') === 'true';
  if (ddlSync) {
    new LoggerService('DatabaseModule').warn(`DDL_SYNC is ${ddlSync}`);
  }
  return ddlSync;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: getDdlSync(configService),
        poolSize: 10, // TODO: à gérer selon l'environnement, web: PROCESS_TYPE=api node apps/back/dist/mainServer.js
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
