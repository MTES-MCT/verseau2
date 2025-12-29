import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class MasaApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || apiKey !== this.configService.get('MASA_API_KEY')) {
      throw new UnauthorizedException('Invalid or missing x-api-key');
    }

    return true;
  }
}
