import { Global, Module } from '@nestjs/common';
import { CsvGenerator } from './csv/csv.types';
import { LoggerService } from './logger/logger.service';
import { ZodValidationPipe } from './schema/zodValidation.pipe';
import { CsvGeneratorService } from './csv/csvGenerator.service';
import { PaginatedExportService } from './csv/paginatedExport.service';
import { MemoryMonitorService } from './memory-monitor/memoryMonitor.service';
import { Zip } from './zip/zip';
import { ZipService } from './zip/zip.service';

@Global()
@Module({
  providers: [
    LoggerService,
    ZodValidationPipe,
    CsvGeneratorService,
    PaginatedExportService,
    MemoryMonitorService,
    ZipService,
    {
      provide: CsvGenerator,
      useExisting: CsvGeneratorService,
    },
    {
      provide: Zip,
      useExisting: ZipService,
    },
  ],
  exports: [
    LoggerService,
    ZodValidationPipe,
    CsvGenerator,
    CsvGeneratorService,
    PaginatedExportService,
    MemoryMonitorService,
    Zip,
    ZipService,
  ],
})
export class SharedModule {}
