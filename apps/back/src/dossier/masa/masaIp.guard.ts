import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MasaIpGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = request.ip;

    const allowedIps = this.configService.get<string>('MASA_ALLOWED_IPS')?.split(',') || [];

    if (allowedIps.length > 0 && clientIp && !allowedIps.includes(clientIp)) {
      throw new ForbiddenException(`IP ${clientIp} is not allowed`);
    }

    return true;
  }
}
