import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoseauGateway } from './roseau/roseau.gateway';
import { AgaEntity } from './roseau/entities/aga.entity';
import { SclEntity } from './roseau/entities/scl.entity';
import { SteuEntity } from './roseau/entities/steu.entity';
import { CxnadmEntity } from './roseau/entities/cxnadm.entity';
import { RoseauRepository } from './roseau/roseau.repository';
import { LanceleauGateway } from './lanceleau/lanceleau.gateway';
import { LanceleauRepository } from './lanceleau/lanceleau.repository';
import { ItvEntity } from './lanceleau/entities/itv.entity';
import { ReferentielGateway } from './referentiel.gateway';
import { ReferentielRepository } from './referentiel.repository';
import { ReferentielService } from './referentiel.service';
import { ReferentielController } from './referentiel.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgaEntity, SclEntity, SteuEntity, CxnadmEntity, ItvEntity])],
  controllers: [ReferentielController],
  providers: [
    { provide: RoseauGateway, useClass: RoseauRepository },
    { provide: LanceleauGateway, useClass: LanceleauRepository },
    { provide: ReferentielGateway, useClass: ReferentielRepository },
    ReferentielService,
  ],
  exports: [RoseauGateway, LanceleauGateway],
})
export class ReferentielModule {}
