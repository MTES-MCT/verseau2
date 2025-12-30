import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationProducer } from './notification.producer';
import { emailFactory } from './brevo/email.factory';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: NotificationGateway,
      useClass: NotificationProducer,
    },
    emailFactory,
  ],
  exports: [NotificationGateway, emailFactory],
})
export class NotificationModule {}
