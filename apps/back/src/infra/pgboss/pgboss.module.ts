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
            const connectionString = configService.getOrThrow<string>('DATABASE_URL');

            const boss = new PgBoss(connectionString);

            await boss.start();
            boss
              .createQueue(QueueName.process_file)
              .then(() => {
                logger.log('Queue created');
              })
              .catch((error) => {
                logger.error(error);
              });
            boss
              .createQueue(QueueName.send_to_sftp)
              .then(() => {
                logger.log('Queue send_to_sftp created');
              })
              .catch((error) => {
                logger.error(error);
              });
            boss
              .createQueue(QueueName.controle_v1)
              .then(() => {
                logger.log('Queue controle_v1 created');
              })
              .catch((error) => {
                logger.error(error);
              });
            boss
              .createQueue(QueueName.controle_sandre)
              .then(() => {
                logger.log('Queue controle_sandre created');
              })
              .catch((error) => {
                logger.error(error);
              });
            boss
              .createQueue(QueueName.email)
              .then(() => {
                logger.log('Queue email created');
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
