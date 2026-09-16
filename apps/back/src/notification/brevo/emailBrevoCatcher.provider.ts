import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from '../email.provider';
import { EmailParams, EmailTemplate } from '../notification';
import * as nodemailer from 'nodemailer';
import { BrevoClient } from '@getbrevo/brevo';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class EmailBrevoCatcherProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;
  private readonly brevo: BrevoClient;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const host = this.config.get<string>('MAILCATCHER_HOST', 'localhost');
    const port = this.config.get<number>('MAILCATCHER_PORT', 1025);

    const apiKey = this.config.getOrThrow<string>('BREVO_API_KEY');
    this.brevo = new BrevoClient({ apiKey, maxRetries: 0 });

    this.transporter = nodemailer.createTransport({
      host,
      port,
      ignoreTLS: true,
    });
    this.logger.setContext(EmailBrevoCatcherProvider.name);
  }

  async send(template: EmailTemplate, emailParams: EmailParams): Promise<{ response: object; body: object }> {
    const templateContent = await this.findTemplateById(template);
    const htmlContent = this.replaceTemplateParams(templateContent.htmlContent, emailParams);

    const mailOptions: nodemailer.SendMailOptions = {
      from: emailParams.from || 'no-reply@example.com',
      to: emailParams.to.map((r) => r.email).join(', '),
      subject: emailParams.subject || templateContent.subject,
      html: htmlContent,
      attachments: emailParams.attachments?.map((att) => ({
        filename: att.fileName,
        content: att.content,
        path: att.filePath,
        encoding: att.content ? 'base64' : undefined,
      })),
    };

    try {
      const info = (await this.transporter.sendMail(mailOptions)) as { messageId: string };
      this.logger.log(`Email sent via MailCatcher to ${emailParams.to.map((t) => t.email).join(', ')}`);
      return {
        response: info,
        body: { messageId: info.messageId },
      };
    } catch (error) {
      this.logger.error('Error sending email via MailCatcher', error);
      throw error;
    }
  }

  private async findTemplateById(id: number) {
    return this.brevo.transactionalEmails.getSmtpTemplate({ templateId: id });
  }

  private replaceTemplateParams(content: string, params: EmailParams) {
    if (!params) {
      return content;
    }
    let hydratedContent = content;
    for (const paramKey of Object.keys(params)) {
      hydratedContent = hydratedContent.replace(
        new RegExp(`{{ *params.${paramKey} *}}`, 'g'),
        String(params[paramKey]),
      );
    }
    return hydratedContent;
  }
}
