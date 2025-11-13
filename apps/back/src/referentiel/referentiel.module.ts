import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoseauGateway } from './roseau/roseau.gateway';
import { AgaEntity } from './roseau/entities/aga.entity';
import { SclEntity } from './roseau/entities/scl.entity';
import { SteuEntity } from './roseau/entities/steu.entity';
import { RoseauRepository } from './roseau/roseau.repository';
import { LanceleauGateway } from './lanceleau/lanceleau.gateway';
import { LanceleauRepository } from './lanceleau/lanceleau.repository';
import { ItvEntity } from './lanceleau/entities/itv.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AgaEntity, SclEntity, SteuEntity, ItvEntity])],
  providers: [
    { provide: RoseauGateway, useClass: RoseauRepository },
    { provide: LanceleauGateway, useClass: LanceleauRepository },
  ],
  exports: [RoseauGateway, LanceleauGateway],
})
export class ReferentielModule {}
