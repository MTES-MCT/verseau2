import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepotController } from './depot/depot.controller';
import { DepotEntity } from './depot/depot.entity';
import { DepotRepository } from './depot/depot.repository';
import { DepotService } from './depot/depot.service';
import { SharedModule } from '@shared/shared.module';
import { DeposerUnFichier } from './depot/usecase/deposerUnFichier';

@Module({
  imports: [TypeOrmModule.forFeature([DepotEntity]), SharedModule],
  controllers: [DepotController],
  providers: [DepotRepository, DepotService, DeposerUnFichier],
  exports: [DepotService],
})
export class DepotModule {}
