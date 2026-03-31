import { Module } from '@nestjs/common';
import { MasaModule } from '@masa/masa.module';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { ConformiteController } from './conformite.controller';
import { ConformiteService } from './conformite.service';
import { HasUserAccessToOuvragesGuard } from '@shared/guards/hasUserAccessToOuvrages.guard';

@Module({
  imports: [MasaModule, ReferentielModule],
  controllers: [ConformiteController],
  providers: [ConformiteService, HasUserAccessToOuvragesGuard],
})
export class ConformiteModule {}
