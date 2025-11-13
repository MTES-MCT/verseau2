import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepotController } from './depot/depot.controller';
import { DepotEntity } from './depot/depot.entity';
import { DepotRepository } from './depot/depot.repository';
import { DepotService } from './depot/depot.service';
import { QueueModule } from '@queue/queue.module';
import { SharedModule } from '@shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([DepotEntity]), QueueModule, SharedModule],
  controllers: [DepotController],
  providers: [DepotRepository, DepotService],
  exports: [DepotService],
})
export class DepotModule {}
