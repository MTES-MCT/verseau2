import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { UserGateway } from './user.gateway';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { DroitsUserService } from './droitsUser.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), ReferentielModule],
  providers: [{ provide: UserGateway, useClass: UserRepository }, UserService, DroitsUserService],
  exports: [UserService, UserGateway, DroitsUserService],
})
export class UserModule {}
