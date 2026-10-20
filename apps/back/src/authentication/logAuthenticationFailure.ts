import { HttpException } from '@nestjs/common';
import { ResponseBodyError } from 'openid-client';
import { errors } from 'jose';
import { LoggerService } from '@shared/logger/logger.service';

/** Expected authentication refusals are not infrastructure failures. */
export function logAuthenticationFailure(logger: LoggerService, message: string, error: unknown): void {
  if (error instanceof HttpException && error.getStatus() < 500) {
    logger.warn(message, { statusCode: error.getStatus() });
  } else if (
    error instanceof errors.JOSEError &&
    [
      'ERR_JWT_EXPIRED',
      'ERR_JWT_INVALID',
      'ERR_JWS_INVALID',
      'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
      'ERR_JWT_CLAIM_VALIDATION_FAILED',
      'ERR_JOSE_ALG_NOT_ALLOWED',
    ].includes(error.code)
  ) {
    logger.warn(message, { errorCode: error.code });
  } else if (
    error instanceof ResponseBodyError &&
    error.status < 500 &&
    ['invalid_grant', 'access_denied', 'invalid_token'].includes(error.error)
  ) {
    logger.warn(message, { statusCode: error.status, oauthError: error.error });
  } else {
    logger.error(message, error);
  }
}
