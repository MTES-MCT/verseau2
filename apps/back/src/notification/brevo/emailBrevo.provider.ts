import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from '../email.provider';
import { EmailParams, EmailTemplate } from '../notification';
import * as brevo from '@getbrevo/brevo';

@Injectable()
export class EmailBrevoProvider implements EmailProvider {
  private emailsApi: brevo.TransactionalEmailsApi;
  private readonly logger = new Logger(EmailBrevoProvider.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('BREVO_API_KEY');
    this.emailsApi = new brevo.TransactionalEmailsApi();
    this.emailsApi.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  }

  async send(template: EmailTemplate, emailParams: EmailParams): Promise<{ response: object; body: object }> {
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.templateId = template;
    sendSmtpEmail.to = emailParams.to;
    sendSmtpEmail.params = emailParams;

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
      const data = await this.emailsApi.sendTransacEmail(sendSmtpEmail);
      this.logger.log(`Email sent successfully to ${emailParams.to.map((t) => t.email).join(', ')}`);
      return { response: data.response, body: data.body };
    } catch (error) {
      this.logger.error('Error sending email via Brevo', error);
      throw error;
    }
  }
}
