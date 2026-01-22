import { Module } from '@nestjs/common';
import { UserModule } from '@user/user.module';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { IndicateursController } from './indicateurs.controller';
import { IndicateursService } from './indicateurs.service';

@Module({
  imports: [UserModule, ReferentielModule],
  controllers: [IndicateursController],
  providers: [IndicateursService],
})
export class IndicateursModule {}
