import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class MasaIpGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = request.ip;

    const allowedIps = process.env.MASA_ALLOWED_IPS?.split(',') || [];

    if (allowedIps.length > 0 && clientIp && !allowedIps.includes(clientIp)) {
      throw new ForbiddenException(`IP ${clientIp} is not allowed`);
    }

    return true;
  }
}
