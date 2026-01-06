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

export function initTestContainerImports(connectionUri: string) {
  return [
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
        // Lanceleau entities
        ItvEntity,
        SupEntity,
        FanEntity,
        ParEntity,
        UrfEntity,
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
      ItvEntity,
      SupEntity,
      FanEntity,
      ParEntity,
      UrfEntity,
    ]),
  ];
}
