import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../infra/queue/queue.service';
import { QueueName } from 'src/infra/queue/queue';
import { LoggerService } from 'src/shared/logger/logger.service';

@Injectable()
export class FileProcessorService implements OnModuleInit {
  constructor(private readonly queueService: QueueService) {
    this.logger.log('FileProcessorService  with custom logger');
  }
  private readonly logger = new LoggerService(FileProcessorService.name);

  async onModuleInit() {
    await this.queueService.work(QueueName.process_file, async ([job]) => {
      this.logger.log('Processing file', job);
      return Promise.resolve().then(() => {
        this.logger.log('Processing file completed');
      });
    });
  }
}
