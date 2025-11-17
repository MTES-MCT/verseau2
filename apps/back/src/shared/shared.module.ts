import { Module } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { MemoryMonitorService } from './memory-monitor/memory-monitor.service';

@Module({
  providers: [LoggerService, MemoryMonitorService],
  exports: [LoggerService, MemoryMonitorService],
})
export class SharedModule {}
