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
import { ReferentielController } from './referentiel.controller';
import { PmoEntity } from './roseau/entities/pmo.entity';
import { TlrefEntity } from './roseau/entities/tlref.entity';
import { CxntechEntity } from './roseau/entities/cxntech.entity';
import { CpyEntity } from './roseau/entities/cpy.entity';
import { ResaEntity } from './roseau/entities/resa.entity';
import { StchanEntity } from './roseau/entities/stchan.entity';
import { AgacEntity } from './roseau/entities/agac.entity';
import { TltoblEntity } from './roseau/entities/tltobl.entity';
import { AgatEntity } from './roseau/entities/agat.entity';
import { SupEntity } from './lanceleau/entities/sup.entity';
import { FanEntity } from './lanceleau/entities/fan.entity';
import { ParEntity } from './lanceleau/entities/par.entity';
import { UrfEntity } from './lanceleau/entities/urf.entity';
import { OrionCredentialsEntity } from './lanceleau/entities/orionCredentials.entity';
import { OrionRoleForPrincipalEntity } from './lanceleau/entities/orionRoleForPrincipal.entity';
import { AgEntity } from './lanceleau/entities/ag.entity';
import { VSteuSclItvEntity } from './lanceleau/entities/vSteuSclItv.entity';
import { CdbEntity } from './lanceleau/entities/cdb.entity';
import { RegEntity } from './lanceleau/entities/reg.entity';
import { ParametreGateway } from './parametre/parametre.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgaEntity,
      SclEntity,
      SteuEntity,
      CxnadmEntity,
      CpyEntity,
      ItvEntity,
      PmoEntity,
      TlrefEntity,
      CxntechEntity,
      ResaEntity,
      StchanEntity,
      AgacEntity,
      TltoblEntity,
      AgatEntity,
      SupEntity,
      FanEntity,
      ParEntity,
      UrfEntity,
      OrionCredentialsEntity,
      OrionRoleForPrincipalEntity,
      AgEntity,
      VSteuSclItvEntity,
      CdbEntity,
      RegEntity,
    ]),
  ],
  controllers: [ReferentielController],
  providers: [
    { provide: RoseauGateway, useClass: RoseauRepository },
    { provide: LanceleauGateway, useClass: LanceleauRepository },
    ParametreGateway,
  ],
  exports: [RoseauGateway, LanceleauGateway],
})
export class ReferentielModule {}
