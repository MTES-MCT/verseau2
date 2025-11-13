import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../infra/queue/queue.service';
import { QueueName } from 'src/infra/queue/queue';

@Injectable()
export class FileProcessorService implements OnModuleInit {
  constructor(private readonly queueService: QueueService) {}

  async onModuleInit() {
    await this.queueService.work(QueueName.process_file, async ([job]) => {
      console.log('!!!!!!!!!!!!!!!!!!Processing file', job);
      return Promise.resolve().then(() => {
        console.log('!!!!!!!!!!!!!!!!!!Processing file completed');
      });
    });
  }
}
