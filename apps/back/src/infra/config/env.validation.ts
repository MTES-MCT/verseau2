export const JWT_SECRET_MIN_LENGTH = 32;

export const validateEnv = (env: Record<string, unknown>): Record<string, unknown> => {
  const jwtSecret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (jwtSecret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET is required and must be at least ${JWT_SECRET_MIN_LENGTH} characters long (got ${jwtSecret.length})`,
    );
  }
  return env;
};
