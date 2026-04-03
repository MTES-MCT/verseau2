import { Module } from '@nestjs/common';
import { EvenementModule } from './evenement/evenement.module';

@Module({
  imports: [EvenementModule],
})
export class SuiviRegulierModule {}
