import { Module } from '@nestjs/common';
import { FileProcessorService } from './file_processor/file.processor.service';
import { ReferentielModule } from './referentiel/referentiel.module';
import { ControleSandreService } from './file_processor/controleSandre';
import { InfraModule } from '@infra/infra.module';

@Module({
  imports: [InfraModule, ReferentielModule],
  providers: [FileProcessorService, ControleSandreService],
})
export class WorkerModule {}
