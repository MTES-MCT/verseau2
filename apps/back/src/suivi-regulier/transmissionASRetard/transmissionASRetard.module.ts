import { Module } from '@nestjs/common';
import { MasaModule } from '@masa/masa.module';
import { TransmissionASRetardController } from './transmissionASRetard.controller';
import { TransmissionASRetardService } from './transmissionASRetard.service';

@Module({
  imports: [MasaModule],
  controllers: [TransmissionASRetardController],
  providers: [TransmissionASRetardService],
})
export class TransmissionASRetardModule {}
