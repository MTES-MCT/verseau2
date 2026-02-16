import { Module } from '@nestjs/common';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { MasaProvider } from './masa.provider';

@Module({
  imports: [ReferentielModule],
  providers: [MasaProvider],
  exports: [MasaProvider],
})
export class MasaModule {}
