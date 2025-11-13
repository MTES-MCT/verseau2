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
    // return new EmailBrevoProvider(config, fileGateway);
  }
  if (emailProvider === 'mock') {
    return new EmailBrevoMockProvider();
  }
  if (emailProvider === 'mailcatcher') {
    // return new EmailBrevoCatcherProvider(config, fileGateway);
  }
  throw new Error('Invalid email provider');
};
