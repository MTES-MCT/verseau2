import { ConfigService } from '@nestjs/config';
import { EmailProvider } from '../email.provider';
import { EmailBrevoMockProvider } from './emailBrevoMock.provider';
import { LoggerService } from '@shared/logger/logger.service';

export const emailFactory = {
  provide: EmailProvider,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => customFactory(configService),
};

const customFactory = (config: ConfigService) => {
  const emailProvider = config.getOrThrow<string>('EMAIL_PROVIDER');
  const logger = new LoggerService('EmailFactory');
  logger.log(`Provider used : ${emailProvider}`, 'EmailContactFactory');
  if (emailProvider === 'brevo') {
    // TODO: Implement Brevo provider
    // return new EmailBrevoProvider(config, fileGateway);
  }
  if (emailProvider === 'mock') {
    logger.warn('Using Mock Email Provider', 'EmailFactory');
    return new EmailBrevoMockProvider();
  }
  if (emailProvider === 'mailcatcher') {
    // TODO: Implement MailCatcher provider
    // return new EmailBrevoCatcherProvider(config, fileGateway);
  }
  throw new Error('Invalid email provider');
};
