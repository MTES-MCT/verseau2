import { Module } from '@nestjs/common';
import { QueueGateway } from '@queue/queue';
import { TransactionalQueueService } from '@queue/transactionalQueue.service';
import { DatabaseMockModule } from './databaseMock.module';

@Module({
  imports: [DatabaseMockModule],
  providers: [
    TransactionalQueueService,
    {
      provide: QueueGateway,
      useValue: {
        on: jest.fn(),
        start: jest.fn(),
        createQueue: jest.fn(),
        stop: jest.fn(),
        send: jest.fn(),
      },
    },
  ],
  exports: [QueueGateway, TransactionalQueueService],
})
export class QueueMockModule {}
