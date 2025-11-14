import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepotController } from './depot/depot.controller';
import { DepotEntity } from './depot/depot.entity';
import { DepotRepository } from './depot/depot.repository';
import { DepotService } from './depot/depot.service';
import { QueueModule } from '@queue/queue.module';
import { SharedModule } from '@shared/shared.module';
import { S3Module } from '@s3/s3.module';
import { DeposerUnFichier } from './depot/usecase/deposerUnFichier';

@Module({
  imports: [TypeOrmModule.forFeature([DepotEntity]), QueueModule, SharedModule, S3Module.forRootAsync()],
  controllers: [DepotController],
  providers: [DepotRepository, DepotService, DeposerUnFichier],
  exports: [DepotService],
})
export class DepotModule {}
