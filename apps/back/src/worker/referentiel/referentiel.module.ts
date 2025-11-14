import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SandreService } from './sandre/sandre.service';
import { ReponseSandreEntity } from './sandre/reponseSandre.entity';
import { ReponseSandreRepository } from './sandre/reponseSandre.repository';
import { DepotRepository } from '@depot/depot/depot.repository';
import { DepotModule } from '@depot/depot.module';

@Module({
  imports: [TypeOrmModule.forFeature([ReponseSandreEntity]), DepotModule],
  providers: [SandreService, ReponseSandreRepository, DepotRepository],
  exports: [SandreService, ReponseSandreRepository],
})
export class ReferentielModule {}
