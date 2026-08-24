import { PipeTransform, BadRequestException } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { ZodError, ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new LoggerService(ZodValidationPipe.name);
  constructor(private schema: ZodType) {}

  transform(value: unknown) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error: unknown) {
      const validationError = error instanceof ZodError ? { issues: error.issues } : { error };
      this.logger.error('Validation failed', { ...validationError, payload: value });
      throw new BadRequestException('Validation failed');
    }
  }
}
