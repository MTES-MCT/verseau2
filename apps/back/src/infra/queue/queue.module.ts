import { Module } from '@nestjs/common';
import { PgbossModule } from '@pgboss/pgboss.module';
import { QueueService } from './queue.service';

@Module({
  imports: [PgbossModule.forRootAsync()],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
