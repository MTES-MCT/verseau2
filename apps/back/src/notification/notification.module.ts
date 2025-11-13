import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationProducer } from './notification.producer';

@Module({
  imports: [],
  providers: [
    {
      provide: NotificationGateway,
      useClass: NotificationProducer,
    },
  ],
  exports: [NotificationGateway],
})
export class NotificationModule {}
