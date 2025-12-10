import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { CustomRequest } from '../constants/customRequest';
import { ulid } from 'ulid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: CustomRequest, _: Response, next: NextFunction) {
    const correlationId = ulid().toLowerCase();
    req.correlationId = correlationId;
    next();
  }
}
