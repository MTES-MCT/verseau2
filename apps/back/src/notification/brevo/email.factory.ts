import { ConfigService } from '@nestjs/config';
import { EmailProvider } from '../email.provider';
import { EmailBrevoMockProvider } from './emailBrevoMock.provider';
import { LoggerService } from '@shared/logger/logger.service';
import { EmailBrevoCatcherProvider } from './emailBrevoCatcher.provider';
import { EmailBrevoProvider } from './emailBrevo.provider';

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
    return new EmailBrevoProvider(config);
  }
  if (emailProvider === 'mock') {
    logger.warn('Using Mock Email Provider', 'EmailFactory');
    return new EmailBrevoMockProvider();
  }
  if (emailProvider === 'mailcatcher') {
    return new EmailBrevoCatcherProvider(config);
  }
  throw new Error('Invalid email provider');
};
