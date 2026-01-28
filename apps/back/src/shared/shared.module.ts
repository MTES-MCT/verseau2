import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { ZodValidationPipe } from './schema/zodValidation.pipe';

@Global()
@Module({
  providers: [LoggerService, ZodValidationPipe],
  exports: [LoggerService, ZodValidationPipe],
})
export class SharedModule {}
