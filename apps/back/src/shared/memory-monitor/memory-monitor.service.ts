import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';

export interface MemoryUsage {
  rss: number; // Resident Set Size - total memory allocated
  heapTotal: number; // Total heap memory allocated
  heapUsed: number; // Heap memory used
  external: number; // Memory used by C++ objects bound to JavaScript
  arrayBuffers: number; // Memory allocated for ArrayBuffers and SharedArrayBuffers
}

@Injectable()
export class MemoryMonitorService {
  private readonly logger = new LoggerService(MemoryMonitorService.name);

  getMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      rss: Math.round((usage.rss / 1024 / 1024) * 100) / 100, // MB
      heapTotal: Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100, // MB
      heapUsed: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100, // MB
      external: Math.round((usage.external / 1024 / 1024) * 100) / 100, // MB
      arrayBuffers: Math.round((usage.arrayBuffers / 1024 / 1024) * 100) / 100, // MB
    };
  }

  logMemoryUsage(context: string, memory: MemoryUsage): void {
    this.logger.log(`Memory usage [${context}]`, {
      rss: `${memory.rss} MB`,
      heapTotal: `${memory.heapTotal} MB`,
      heapUsed: `${memory.heapUsed} MB`,
      heapUsedPercent: `${Math.round((memory.heapUsed / memory.heapTotal) * 100)}%`,
      external: `${memory.external} MB`,
      arrayBuffers: `${memory.arrayBuffers} MB`,
    });
  }

  calculateMemoryDelta(
    before: MemoryUsage,
    after: MemoryUsage,
  ): {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  } {
    return {
      rss: after.rss - before.rss,
      heapUsed: after.heapUsed - before.heapUsed,
      heapTotal: after.heapTotal - before.heapTotal,
    };
  }

  formatMemoryDelta(delta: { rss: number; heapUsed: number; heapTotal: number }): {
    rss: string;
    heapUsed: string;
    heapTotal: string;
  } {
    return {
      rss: `${delta.rss > 0 ? '+' : ''}${delta.rss.toFixed(2)} MB`,
      heapUsed: `${delta.heapUsed > 0 ? '+' : ''}${delta.heapUsed.toFixed(2)} MB`,
      heapTotal: `${delta.heapTotal > 0 ? '+' : ''}${delta.heapTotal.toFixed(2)} MB`,
    };
  }
}
