import { Module } from '@nestjs/common';
import { EvenementModule } from './evenement/evenement.module';
import { BilanModule } from './bilan/bilan.module';

@Module({
  imports: [EvenementModule, BilanModule],
})
export class SuiviRegulierModule {}
