import { ConfigService } from '@nestjs/config';
import { EmailProvider } from '../email.provider';
import { EmailBrevoMockProvider } from './emailBrevoMock.provider';
import { LoggerService } from '@shared/logger/logger.service';
import { EmailBrevoCatcherProvider } from './emailBrevoCatcher.provider';
import { EmailBrevoProvider } from './emailBrevo.provider';

export const emailFactory = {
  provide: EmailProvider,
  inject: [ConfigService, LoggerService],
  useFactory: (configService: ConfigService, logger: LoggerService) => customFactory(configService, logger),
};

const customFactory = (config: ConfigService, logger: LoggerService) => {
  const emailProvider = config.getOrThrow<string>('EMAIL_PROVIDER');
  logger.log(`Provider used : ${emailProvider}`, 'EmailContactFactory');
  if (emailProvider === 'brevo') {
    return new EmailBrevoProvider(config, logger);
  }
  if (emailProvider === 'mock') {
    logger.warn('Using Mock Email Provider', 'EmailFactory');
    return new EmailBrevoMockProvider();
  }
  if (emailProvider === 'mailcatcher') {
    return new EmailBrevoCatcherProvider(config, logger);
  }
  throw new Error('Invalid email provider');
};
