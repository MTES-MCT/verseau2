import { Module } from '@nestjs/common';
import { MasaModule } from '@masa/masa.module';
import { MesuresController } from './mesures.controller';
import { MesuresService } from './mesures.service';
import { EvenementModule } from '../suivi-regulier/evenement/evenement.module';

@Module({
  imports: [MasaModule, EvenementModule],
  controllers: [MesuresController],
  providers: [MesuresService],
})
export class MesuresModule {}
