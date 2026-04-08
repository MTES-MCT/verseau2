import { Module } from '@nestjs/common';
import { EvenementModule } from './evenement/evenement.module';
import { BilanModule } from './bilan/bilan.module';
import { TransmissionASRetardModule } from './transmissionASRetard/transmissionASRetard.module';

@Module({
  imports: [EvenementModule, BilanModule, TransmissionASRetardModule],
})
export class SuiviRegulierModule {}
