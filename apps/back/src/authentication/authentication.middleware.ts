import { Inject, Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { Authentication } from './authentication';
import { CustomRequest } from '@shared/constants/customRequest';

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  constructor(@Inject(Authentication) private readonly authentication: Authentication) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const token = this.extractTokenFromHeader(req);
    if (token) {
      try {
        const user = await this.authentication.validateToken(token);
        req.user = user;
        req.token = token;
      } catch {
        throw new UnauthorizedException('Missing or invalid authorization token');
      }
    } else {
      throw new UnauthorizedException('Missing authorization token');
    }
    next();
  }

  private extractTokenFromHeader(request: CustomRequest): string | undefined {
    const token = request.headers['authorization']?.split(' ')[1];
    return token;
  }
}
