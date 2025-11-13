import { Module } from '@nestjs/common';
import { DepotModule } from '@depot/depot.module';
import { SharedModule } from '@shared/shared.module';
import { InfraModule } from '@infra/infra.module';
import { NotificationModule } from '@notification/notification.module';

@Module({
  imports: [DepotModule, InfraModule, SharedModule, NotificationModule],
})
export class ApiModule {}
