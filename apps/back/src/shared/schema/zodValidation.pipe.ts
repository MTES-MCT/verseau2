import { PipeTransform, BadRequestException } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodType) {}

  transform(value: unknown) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      const logger = new LoggerService(ZodValidationPipe.name);
      logger.error('Validation failed', error);
      throw new BadRequestException('Validation failed');
    }
  }
}
