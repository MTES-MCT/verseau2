import { Module } from '@nestjs/common';
import { UserModule } from '@user/user.module';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { IndicateursController } from './indicateurs.controller';
import { IndicateursService } from './indicateurs.service';
import { IndicateursGateway } from './indicateurs.gateway';
import { IndicateursRepository } from './indicateurs.repository';

@Module({
  imports: [UserModule, ReferentielModule],
  controllers: [IndicateursController],
  providers: [IndicateursService, { provide: IndicateursGateway, useClass: IndicateursRepository }],
})
export class IndicateursModule {}
