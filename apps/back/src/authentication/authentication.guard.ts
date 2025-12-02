import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Authentication } from './authentication';
import { LoggerService } from '@shared/logger/logger.service';

export const REQUEST_USER_KEY = 'user';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    @Inject(Authentication) private readonly authentication: Authentication,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AuthenticationGuard');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const user = await this.authentication.validateToken(token);
      request[REQUEST_USER_KEY] = user;
      return true;
    } catch (error: unknown) {
      this.logger.error('AuthenticationGuard canActivate error', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const token = request.headers['authorization']?.split(' ')[1];
    return token;
  }
}
