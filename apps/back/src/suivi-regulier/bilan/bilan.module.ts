import { Module } from '@nestjs/common';
import { MasaModule } from '@masa/masa.module';
import { BilanController } from './bilan.controller';
import { BilanService } from './bilan.service';

@Module({
  imports: [MasaModule],
  controllers: [BilanController],
  providers: [BilanService],
})
export class BilanModule {}
