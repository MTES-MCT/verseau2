import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { UserGateway } from './user.gateway';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { ReferentielModule } from '@referentiel/referentiel.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), ReferentielModule],
  providers: [{ provide: UserGateway, useClass: UserRepository }, UserService],
  exports: [UserService, UserGateway],
})
export class UserModule {}
