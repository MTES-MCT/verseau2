import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from '../email.provider';
import { EmailParams, EmailTemplate } from '../notification';
import { Brevo, BrevoClient } from '@getbrevo/brevo';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class EmailBrevoProvider implements EmailProvider {
  private readonly brevo: BrevoClient;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const apiKey = this.config.getOrThrow<string>('BREVO_API_KEY');
    this.brevo = new BrevoClient({ apiKey, maxRetries: 0 });
    this.logger.setContext(EmailBrevoProvider.name);
  }

  async send(template: EmailTemplate, emailParams: EmailParams): Promise<{ response: object; body: object }> {
    const sendSmtpEmail: Brevo.SendTransacEmailRequest = {
      templateId: template,
      to: emailParams.to,
      params: { ...emailParams },
    };

    if (emailParams.from) {
      sendSmtpEmail.sender = { email: emailParams.from };
    }

    if (emailParams.subject) {
      sendSmtpEmail.subject = emailParams.subject;
    }

    if (emailParams.attachments) {
      sendSmtpEmail.attachment = emailParams.attachments.map((att) => ({
        name: att.fileName,
        content: att.content,
        url: att.filePath,
      }));
    }

    try {
      const { data, rawResponse } = await this.brevo.transactionalEmails
        .sendTransacEmail(sendSmtpEmail)
        .withRawResponse();
      this.logger.log(`Email sent successfully to ${emailParams.to.map((t) => t.email).join(', ')}`);
      return { response: rawResponse, body: data };
    } catch (error) {
      this.logger.error('Error sending email via Brevo', error);
      throw error;
    }
  }
}
