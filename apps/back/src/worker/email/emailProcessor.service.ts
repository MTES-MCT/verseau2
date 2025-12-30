import { Injectable, Inject } from '@nestjs/common';
import { EmailProvider } from '@notification/email.provider';
import { EmailTemplate, EmailParams } from '@notification/notification';
import { LoggerService } from '@shared/logger/logger.service';

interface EmailJobData {
  params: EmailParams;
  template: EmailTemplate;
}

@Injectable()
export class EmailProcessorService {
  private readonly logger = new LoggerService(EmailProcessorService.name);

  constructor(@Inject(EmailProvider) private readonly emailProvider: EmailProvider) {}

  async process(data: EmailJobData): Promise<void> {
    this.logger.log(`Sending email with template ${data.template}`);
    try {
      await this.emailProvider.send(data.template, data.params);
      this.logger.log(`Email sent successfully`);
    } catch (error) {
      this.logger.error(`Failed to send email`, {
        template: data.template,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
