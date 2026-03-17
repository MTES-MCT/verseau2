import { Module } from '@nestjs/common';
import { MasaModule } from '@masa/masa.module';
import { MesuresController } from './mesures.controller';
import { MesuresService } from './mesures.service';

@Module({
  imports: [MasaModule],
  controllers: [MesuresController],
  providers: [MesuresService],
})
export class MesuresModule {}
