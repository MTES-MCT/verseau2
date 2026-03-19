import { TypeOrmModule } from '@nestjs/typeorm';
import { ControleEntity } from '@dossier/controle/controle.entity';
import { DepotEntity } from '@dossier/depot/depot.entity';
import { UserEntity } from '@user/user.entity';
import { SteuEntity } from '@referentiel/roseau/entities/steu.entity';
import { CxnadmEntity } from '@referentiel/roseau/entities/cxnadm.entity';
import { PmoEntity } from '@referentiel/roseau/entities/pmo.entity';
import { TlrefEntity } from '@referentiel/roseau/entities/tlref.entity';
import { AgaEntity } from '@referentiel/roseau/entities/aga.entity';
import { SclEntity } from '@referentiel/roseau/entities/scl.entity';
import { CxntechEntity } from '@referentiel/roseau/entities/cxntech.entity';
import { ItvEntity } from '@referentiel/lanceleau/entities/itv.entity';
import { SupEntity } from '@referentiel/lanceleau/entities/sup.entity';
import { FanEntity } from '@referentiel/lanceleau/entities/fan.entity';
import { ParEntity } from '@referentiel/lanceleau/entities/par.entity';
import { UrfEntity } from '@referentiel/lanceleau/entities/urf.entity';
import { ReponseSandreEntity } from '@dossier/controle/technique/sandre/reponseSandre.entity';
import { MasaEntity } from '@dossier/masa/masa.entity';
import { CpyEntity } from '@referentiel/roseau/entities/cpy.entity';
import { ResaEntity } from '@referentiel/roseau/entities/resa.entity';
import { StchanEntity } from '@referentiel/roseau/entities/stchan.entity';
import { TltoblEntity } from '@referentiel/roseau/entities/tltobl.entity';
import { AgacEntity } from '@referentiel/roseau/entities/agac.entity';
import { PleEntity } from '@referentiel/roseau/entities/ple.entity';
import { AlrEntity } from '@referentiel/roseau/entities/alr.entity';
import { SharedModule } from '@shared/shared.module';
import { OrionCredentialsEntity } from '@referentiel/lanceleau/entities/orionCredentials.entity';
import { VSteuSclItvEntity } from '@referentiel/lanceleau/entities/vSteuSclItv.entity';
import { AgEntity } from '@referentiel/lanceleau/entities/ag.entity';
import { OrionRoleForPrincipalEntity } from '@referentiel/lanceleau/entities/orionRoleForPrincipal.entity';
import { OrmEntity } from '@referentiel/roseau/entities/orm.entity';

export function initTestContainerImports(connectionUri: string) {
  return [
    SharedModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: connectionUri,
      entities: [
        // App entities
        ControleEntity,
        DepotEntity,
        UserEntity,
        ReponseSandreEntity,
        MasaEntity,
        // Roseau entities
        SteuEntity,
        CxnadmEntity,
        PmoEntity,
        TlrefEntity,
        AgaEntity,
        SclEntity,
        CxntechEntity,
        CpyEntity,
        ResaEntity,
        StchanEntity,
        TltoblEntity,
        AgacEntity,
        PleEntity,
        AlrEntity,
        OrmEntity,
        // Lanceleau entities
        ItvEntity,
        SupEntity,
        FanEntity,
        ParEntity,
        UrfEntity,
        OrionCredentialsEntity,
        OrionRoleForPrincipalEntity,
        AgEntity,
        // Verseau entities
        VSteuSclItvEntity,
      ],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([
      ControleEntity,
      DepotEntity,
      UserEntity,
      ReponseSandreEntity,
      MasaEntity,
      SteuEntity,
      CxnadmEntity,
      PmoEntity,
      TlrefEntity,
      AgaEntity,
      SclEntity,
      CxntechEntity,
      CpyEntity,
      ResaEntity,
      StchanEntity,
      TltoblEntity,
      AgacEntity,
      PleEntity,
      AlrEntity,
      OrmEntity,
      ItvEntity,
      SupEntity,
      FanEntity,
      ParEntity,
      UrfEntity,
      OrionCredentialsEntity,
      OrionRoleForPrincipalEntity,
      AgEntity,
      VSteuSclItvEntity,
    ]),
  ];
}
