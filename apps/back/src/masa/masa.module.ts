import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { MasaProvider } from './masa.provider';

@Module({
  imports: [ReferentielModule, CacheModule.register()],
  providers: [MasaProvider],
  exports: [MasaProvider],
})
export class MasaModule {}
