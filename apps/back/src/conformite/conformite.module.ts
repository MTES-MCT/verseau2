import { Module } from '@nestjs/common';
import { MasaModule } from '@masa/masa.module';
import { ConformiteController } from './conformite.controller';
import { ConformiteService } from './conformite.service';

@Module({
  imports: [MasaModule],
  controllers: [ConformiteController],
  providers: [ConformiteService],
})
export class ConformiteModule {}
