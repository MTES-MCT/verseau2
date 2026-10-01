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
      if (error instanceof ZodError) {
        this.logger.warn('Validation failed', {
          issues: error.issues.map(({ code, path }) => ({ code, path })),
        });
      } else {
        this.logger.error('Unexpected validation failure', error);
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
