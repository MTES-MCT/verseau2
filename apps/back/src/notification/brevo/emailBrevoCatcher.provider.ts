/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from '../email.provider';
import { EmailParams, EmailTemplate, EmailWithMessage } from '../notification';
import * as nodemailer from 'nodemailer';
import * as brevo from '@getbrevo/brevo';

@Injectable()
export class EmailBrevoCatcherProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailBrevoCatcherProvider.name);
  private emailsApi: brevo.TransactionalEmailsApi;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('MAILCATCHER_HOST', 'localhost');
    const port = this.config.get<number>('MAILCATCHER_PORT', 1025);

    const apiKey = this.config.getOrThrow<string>('BREVO_API_KEY');
    this.emailsApi = new brevo.TransactionalEmailsApi();
    this.emailsApi.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      ignoreTLS: true,
    });
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
      const info = await this.transporter.sendMail(mailOptions);
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

  private async findTemplateById(id: number): Promise<brevo.GetSmtpTemplateOverview> {
    const template = await this.emailsApi.getSmtpTemplate(id);
    return template.body;
  }

  private replaceTemplateParams(content: string, params: any) {
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
