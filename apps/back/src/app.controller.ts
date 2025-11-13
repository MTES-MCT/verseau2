import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { QueueService } from '@queue/queue.service';
import { QueueName } from '@queue/queue';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  async getHello(): Promise<string> {
    const result = await this.queueService.send(QueueName.process_file, {
      message: 'Hello World',
    });
    console.log(result);
    return this.appService.getHello();
  }
}
