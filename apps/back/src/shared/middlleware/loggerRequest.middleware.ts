import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CustomRequest } from '../constants/customRequest';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggerRequestMiddleware implements NestMiddleware {
  constructor(private logger: LoggerService) {
    this.logger.setContext(LoggerRequestMiddleware.name);
  }
  use(req: CustomRequest, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const now = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - now;
      this.logger.log(`userId: ${req.user?.cerbereId} - ${method} ${originalUrl} - ${statusCode} - ${responseTime}ms`);
    });
    next();
  }
}
