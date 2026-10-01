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

  it('logs expected validation issues as warnings without the payload', () => {
    const loggerWarnSpy = jest.spyOn(LoggerService.prototype, 'warn').mockImplementation(() => undefined);
    const loggerErrorSpy = jest.spyOn(LoggerService.prototype, 'error').mockImplementation(() => undefined);
    const pipe = new ZodValidationPipe(z.object({ name: z.string() }));
    const payload = { name: 42, password: 'sensitive' };

    expect(() => pipe.transform(payload)).toThrow(new BadRequestException('Validation failed'));
    expect(loggerErrorSpy).not.toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
    expect(loggerWarnSpy.mock.calls[0]?.[0]).toBe('Validation failed');

    const loggedContext: unknown = loggerWarnSpy.mock.calls[0]?.[1];
    expect(loggedContext).not.toHaveProperty('payload');
    expect(JSON.stringify(loggedContext)).not.toContain('sensitive');
    expect(loggedContext).toHaveProperty('issues');

    if (typeof loggedContext !== 'object' || loggedContext === null || !('issues' in loggedContext)) {
      throw new Error('Expected validation log context');
    }
    expect(loggedContext.issues).toEqual([
      {
        code: 'invalid_type',
        path: ['name'],
      },
    ]);
    expect(JSON.stringify(loggedContext)).not.toContain('\\n');
  });

  it('logs unexpected schema errors at error level while preserving the existing response', () => {
    const loggerErrorSpy = jest.spyOn(LoggerService.prototype, 'error').mockImplementation(() => undefined);
    const loggerWarnSpy = jest.spyOn(LoggerService.prototype, 'warn').mockImplementation(() => undefined);
    const error = new Error('Unexpected transform failure');
    const pipe = new ZodValidationPipe(
      z.string().transform(() => {
        throw error;
      }),
    );

    expect(() => pipe.transform('value')).toThrow(BadRequestException);
    expect(loggerErrorSpy).toHaveBeenCalledWith('Unexpected validation failure', error);
    expect(loggerWarnSpy).not.toHaveBeenCalled();
  });
});
