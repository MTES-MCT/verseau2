import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { CustomRequest } from '@shared/constants/customRequest';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class LoggerRequestMiddleware implements NestMiddleware {
  constructor(private logger: LoggerService) {
    this.logger.setContext(LoggerRequestMiddleware.name);
  }
  use(req: CustomRequest, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const now = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - now;
      // Query strings may contain credentials or user-entered data.
      const context = {
        userId: req.user?.cerbereId,
        ip,
        method,
        path: originalUrl.split('?')[0],
        statusCode,
        responseTime,
      };
      if (statusCode >= 500) {
        this.logger.error('HTTP request failed', context);
      } else if (statusCode >= 400) {
        this.logger.warn('HTTP request rejected', context);
      } else {
        this.logger.log('HTTP request completed', context);
      }
    });
    next();
  }
}
