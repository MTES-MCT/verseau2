import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PgBoss } from 'pg-boss';
import { DatabaseModule } from '@database/database.module';
import { QueueName } from '@queue/queue';
import { LoggerService } from '@shared/logger/logger.service';

export const PGBOSS = Symbol('PGBOSS');

@Global()
@Module({})
export class PgbossModule {
  static forRootAsync(): DynamicModule {
    const logger = new LoggerService(PgbossModule.name);
    return {
      module: PgbossModule,
      imports: [ConfigModule, DatabaseModule],
      providers: [
        {
          provide: PGBOSS,
          useFactory: async (configService: ConfigService) => {
            const pgBossConfig = {
              host: configService.get<string>('POSTGRES_HOST', 'localhost'),
              port: configService.get<number>('POSTGRES_PORT', 5432),
              user: configService.get<string>('POSTGRES_USER', 'postgres'),
              password: configService.get<string>('POSTGRES_PASSWORD', 'postgres'),
              database: configService.get<string>('POSTGRES_DB', 'verseau2'),
            };

            const boss = new PgBoss(pgBossConfig);

            await boss.start();
            boss
              .createQueue(QueueName.process_file)
              .then(() => {
                logger.log('Queue created');
              })
              .catch((error) => {
                logger.error(error);
              });

            return boss;
          },
          inject: [ConfigService],
        },
      ],
      exports: [PGBOSS],
    };
  }
}
