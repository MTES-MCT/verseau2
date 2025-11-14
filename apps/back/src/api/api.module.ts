import { Module } from '@nestjs/common';
import { DepotModule } from '@depot/depot.module';
import { WorkerModule } from '@worker/worker.module';
import { SharedModule } from '@shared/shared.module';
import { InfraModule } from '@infra/infra.module';

@Module({
  imports: [DepotModule, InfraModule, WorkerModule, SharedModule],
})
export class ApiModule {}
