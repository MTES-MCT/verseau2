import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepotController } from './depot/depot.controller';
import { DepotEntity } from './depot/depot.entity';
import { DepotRepository } from './depot/depot.repository';
import { DepotService } from './depot/depot.service';
import { QueueModule } from '@queue/queue.module';
import { SharedModule } from '@shared/shared.module';
import { S3Module } from '@s3/s3.module';
import { S3Service } from '@s3/s3.service';
import { S3 } from '@s3/s3';
import { DeposerUnFichier } from './depot/usecase/deposerUnFichier';

@Module({
  imports: [TypeOrmModule.forFeature([DepotEntity]), QueueModule, SharedModule, S3Module.forRootAsync()],
  controllers: [DepotController],
  providers: [DepotRepository, DepotService, { provide: S3, useClass: S3Service }, DeposerUnFichier],
  exports: [DepotService],
})
export class DepotModule {}
