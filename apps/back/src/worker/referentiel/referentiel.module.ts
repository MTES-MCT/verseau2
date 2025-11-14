import { Module } from '@nestjs/common';
import { SandreService } from './sandre/sandre.service';

@Module({
  providers: [SandreService],
  exports: [SandreService],
})
export class ReferentielModule {}
