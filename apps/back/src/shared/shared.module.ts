import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { MemoryMonitorService } from './memory-monitor/memoryMonitor.service';
import { ZodValidationPipe } from './schema/zodValidation.pipe';

@Global()
@Module({
  providers: [LoggerService, MemoryMonitorService, ZodValidationPipe],
  exports: [LoggerService, MemoryMonitorService, ZodValidationPipe],
})
export class SharedModule {}
