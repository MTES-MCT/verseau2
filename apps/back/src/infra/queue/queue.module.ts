import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { QueueService } from './queue.service';
import { QueueGateway, PGBOSS } from './queue';
import { queueProvider } from './queue.provider';
import { LoggerService } from '@shared/logger/logger.service';
import type { PgBoss } from './pgboss';

/**
 * Handles graceful shutdown of pg-boss
 */
class QueueShutdownService implements OnModuleDestroy {
  constructor(
    @Inject(PGBOSS) private readonly pgboss: PgBoss<object>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('QueueModule');
  }

  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log('Stopping PgBoss...');
      await this.pgboss.stop();
      this.logger.log('PgBoss stopped successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error stopping PgBoss: ${errorMsg}`);
    }
  }
}

@Module({
  imports: [DatabaseModule],
  providers: [queueProvider, QueueService, QueueShutdownService, { provide: QueueGateway, useExisting: QueueService }],
  exports: [QueueGateway],
})
export class QueueModule {}
