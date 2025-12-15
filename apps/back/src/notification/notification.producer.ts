import { Injectable, Inject } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { EmailTemplate } from './notification';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';

@Injectable()
export class NotificationProducer implements NotificationGateway {
  constructor(@Inject(QueueGateway) private readonly queueService: Queue) {}

  async sendEmail<T>(params: T, template: EmailTemplate): Promise<void> {
    await this.queueService.send(QueueName.email, { params, template });
  }
}
