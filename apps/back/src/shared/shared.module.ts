import { Global, Module } from '@nestjs/common';
import { CsvGenerator } from '@lib/shared';
import { LoggerService } from './logger/logger.service';
import { ZodValidationPipe } from './schema/zodValidation.pipe';
import { CsvGeneratorService } from './csv/csvGenerator.service';
import { PaginatedExportService } from './csv/paginatedExport.service';

@Global()
@Module({
  providers: [
    LoggerService,
    ZodValidationPipe,
    CsvGeneratorService,
    PaginatedExportService,
    {
      provide: CsvGenerator,
      useExisting: CsvGeneratorService,
    },
  ],
  exports: [LoggerService, ZodValidationPipe, CsvGenerator, CsvGeneratorService, PaginatedExportService],
})
export class SharedModule {}
