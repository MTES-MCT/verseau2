import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { QueueService } from './queue.service';
import { QueueGateway } from './queue';
import { queueProvider } from './queue.provider';

@Module({
  imports: [DatabaseModule],
  providers: [queueProvider, QueueService, { provide: QueueGateway, useExisting: QueueService }],
  exports: [QueueGateway],
})
export class QueueModule {}
