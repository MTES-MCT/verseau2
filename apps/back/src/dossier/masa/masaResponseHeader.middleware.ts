import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class MasaResponseHeaderMiddleware implements NestMiddleware {
  use(_: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Source', 'Verseau2');
    next();
  }
}
