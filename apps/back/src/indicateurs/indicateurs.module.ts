import { Module } from '@nestjs/common';
import { UserModule } from '@user/user.module';
import { MasaModule } from '@masa/masa.module';
import { IndicateursController } from './indicateurs.controller';
import { IndicateursService } from './indicateurs.service';
import { IndicateursGateway } from './indicateurs.gateway';
import { IndicateursRepository } from './indicateurs.repository';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [UserModule, MasaModule, CacheModule.register({ ttl: 5000 })],
  controllers: [IndicateursController],
  providers: [IndicateursService, { provide: IndicateursGateway, useClass: IndicateursRepository }],
})
export class IndicateursModule {}
