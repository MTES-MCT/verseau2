import { Module } from '@nestjs/common';
import { MasaModule } from '@masa/masa.module';
import { EvenementController } from './evenement.controller';
import { EvenementService } from './evenement.service';

@Module({
  imports: [MasaModule],
  controllers: [EvenementController],
  providers: [EvenementService],
  exports: [EvenementService],
})
export class EvenementModule {}
