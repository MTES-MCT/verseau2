import { JWT_SECRET_MIN_LENGTH, validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validSecret = 'a'.repeat(JWT_SECRET_MIN_LENGTH);

  it('accepts a JWT_SECRET of sufficient length', () => {
    expect(() => validateEnv({ JWT_SECRET: validSecret })).not.toThrow();
    expect(validateEnv({ JWT_SECRET: validSecret })).toEqual({ JWT_SECRET: validSecret });
  });

  it('rejects a missing JWT_SECRET', () => {
    expect(() => validateEnv({})).toThrow(/JWT_SECRET is required/);
  });

  it('rejects a non-string JWT_SECRET', () => {
    expect(() => validateEnv({ JWT_SECRET: 42 })).toThrow(/JWT_SECRET is required/);
  });

  it('rejects a short JWT_SECRET', () => {
    expect(() => validateEnv({ JWT_SECRET: 'short' })).toThrow(
      new RegExp(`at least ${JWT_SECRET_MIN_LENGTH} characters`),
    );
  });

  it('rejects a whitespace-padded JWT_SECRET below the minimum', () => {
    const padded = `  ${'a'.repeat(JWT_SECRET_MIN_LENGTH - 1)}  `;
    expect(() => validateEnv({ JWT_SECRET: padded })).toThrow(/at least 32 characters/);
  });
});
