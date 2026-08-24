import { BadRequestException } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { z } from 'zod';
import { ZodValidationPipe } from './zodValidation.pipe';

describe('ZodValidationPipe', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the parsed payload when validation succeeds', () => {
    const pipe = new ZodValidationPipe(z.object({ count: z.coerce.number() }));

    expect(pipe.transform({ count: '42' })).toEqual({ count: 42 });
  });

  it('logs the payload when validation fails', () => {
    const loggerErrorSpy = jest.spyOn(LoggerService.prototype, 'error').mockImplementation(() => undefined);
    const pipe = new ZodValidationPipe(z.object({ name: z.string() }));
    const payload = { name: 42 };

    expect(() => pipe.transform(payload)).toThrow(new BadRequestException('Validation failed'));
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy.mock.calls[0]?.[0]).toBe('Validation failed');

    const loggedContext: unknown = loggerErrorSpy.mock.calls[0]?.[1];
    expect(loggedContext).toHaveProperty('payload', payload);
    expect(loggedContext).toHaveProperty('issues');

    if (typeof loggedContext !== 'object' || loggedContext === null || !('issues' in loggedContext)) {
      throw new Error('Expected validation log context');
    }
    expect(loggedContext.issues).toEqual([
      {
        code: 'invalid_type',
        expected: 'string',
        message: 'Invalid input: expected string, received number',
        path: ['name'],
      },
    ]);
    expect(JSON.stringify(loggedContext)).not.toContain('\\n');
  });
});
