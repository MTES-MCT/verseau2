import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { ClsService } from 'nestjs-cls';
import { CustomClsStore } from '../logger/cls-store.interface';
import { CustomRequest } from '../constants/customRequest';
import { ulid } from 'ulid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService<CustomClsStore>) {}

  use(req: CustomRequest, _: Response, next: NextFunction) {
    const correlationId = ulid().toLowerCase();
    req.correlationId = correlationId;
    this.cls.set('correlationId', correlationId);
    next();
  }
}
