import { PipeTransform, BadRequestException } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new LoggerService(ZodValidationPipe.name);
  constructor(private schema: ZodType) {}

  transform(value: unknown) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      this.logger.error('Validation failed', error);
      throw new BadRequestException('Validation failed');
    }
  }
}
