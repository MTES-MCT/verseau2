import { Module } from '@nestjs/common';
import { FileProcessorService } from './file-processor/file.processor.service';
import { ReferentielModule } from './referentiel/referentiel.module';
import { ControleSandreService } from './file-processor/controleSandre';
import { InfraModule } from '@infra/infra.module';
import { SharedModule } from '@shared/shared.module';

@Module({
  imports: [InfraModule, ReferentielModule, SharedModule],
  providers: [FileProcessorService, ControleSandreService],
})
export class WorkerModule {}
