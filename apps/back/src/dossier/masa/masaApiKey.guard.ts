import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class MasaApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;
    const configuredKey = this.configService.get<string>('MASA_API_KEY');

    if (!apiKey || !configuredKey || apiKey.length !== configuredKey.length) {
      throw new UnauthorizedException('Invalid or missing x-api-key');
    }

    const isKeyValid = timingSafeEqual(Buffer.from(apiKey), Buffer.from(configuredKey));
    if (!isKeyValid) {
      throw new UnauthorizedException('Invalid or missing x-api-key');
    }

    return true;
  }
}
