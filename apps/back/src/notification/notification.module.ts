import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationProducer } from './notification.producer';
import { ConfigModule } from '@nestjs/config';
import { EmailProvider } from './email.provider';
import { emailFactory } from './brevo/email.factory';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: NotificationGateway,
      useClass: NotificationProducer,
    },
    emailFactory,
  ],
  exports: [NotificationGateway, EmailProvider],
})
export class NotificationModule {}
