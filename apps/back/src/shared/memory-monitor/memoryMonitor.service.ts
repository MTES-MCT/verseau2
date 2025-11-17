import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

@Injectable()
export class MemoryMonitorService {
  constructor(@Inject(LoggerService) private readonly logger: LoggerService) {
    this.logger.setContext(MemoryMonitorService.name);
  }

  getMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      rss: Math.round((usage.rss / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100,
      heapUsed: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100,
      external: Math.round((usage.external / 1024 / 1024) * 100) / 100,
      arrayBuffers: Math.round((usage.arrayBuffers / 1024 / 1024) * 100) / 100,
    };
  }

  logMemoryUsage(context: string, memory: MemoryUsage): void {
    this.logger.debug(`Memory usage [${context}]`, {
      rss: `${memory.rss} MB`,
      heapTotal: `${memory.heapTotal} MB`,
      heapUsed: `${memory.heapUsed} MB`,
      heapUsedPercent: `${Math.round((memory.heapUsed / memory.heapTotal) * 100)}%`,
      external: `${memory.external} MB`,
      arrayBuffers: `${memory.arrayBuffers} MB`,
    });
  }
}
