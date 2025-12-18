import { Module } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { MemoryMonitorService } from './memory-monitor/memoryMonitor.service';
import { CorrelationIdMiddleware } from './middlleware/correlationId.middleware';
import { LoggerRequestMiddleware } from './middlleware/loggerRequest.middleware';
import { ZodValidationPipe } from './schema/zodValidation.pipe';

@Module({
  providers: [LoggerService, MemoryMonitorService, CorrelationIdMiddleware, LoggerRequestMiddleware, ZodValidationPipe],
  exports: [LoggerService, MemoryMonitorService, CorrelationIdMiddleware, LoggerRequestMiddleware, ZodValidationPipe],
})
export class SharedModule {}
