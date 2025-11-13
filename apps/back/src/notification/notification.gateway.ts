import { EmailTemplate } from './notification';

export interface NotificationGateway {
  sendEmail<T>(params: T, template: EmailTemplate): Promise<void>;
}

export const NotificationGateway = Symbol('NotificationGateway');
