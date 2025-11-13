import { Injectable } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { EmailTemplate } from './notification';
import { QueueService } from '@queue/queue.service';
import { QueueName } from '@queue/queue';

@Injectable()
export class NotificationProducer implements NotificationGateway {
  constructor(private readonly queueService: QueueService) {}

  async sendEmail<T>(params: T, template: EmailTemplate): Promise<void> {
    await this.queueService.send(QueueName.email, { params, template });
  }
}
