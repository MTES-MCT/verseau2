import { EmailParams, EmailTemplate } from '@notification/notification';

export interface EmailProvider {
  send(template: EmailTemplate, emailParams: EmailParams): Promise<{ response: object; body: object }>;
}

export const EmailProvider = Symbol('EmailProvider');
