import { Module } from '@nestjs/common';
import { QueueGateway } from '@queue/queue';
import { DatabaseMockModule } from './databaseMock.module';

@Module({
  imports: [DatabaseMockModule],
  providers: [
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
  exports: [QueueGateway],
})
export class QueueMockModule {}
