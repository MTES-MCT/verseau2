import { Module } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { MemoryMonitorService } from './memory-monitor/memoryMonitor.service';
import { CorrelationIdMiddleware } from './middlleware/correlationId.middleware';
import { LoggerRequestMiddleware } from './middlleware/loggerRequest.middleware';

@Module({
  providers: [LoggerService, MemoryMonitorService, CorrelationIdMiddleware, LoggerRequestMiddleware],
  exports: [LoggerService, MemoryMonitorService, CorrelationIdMiddleware, LoggerRequestMiddleware],
})
export class SharedModule {}
