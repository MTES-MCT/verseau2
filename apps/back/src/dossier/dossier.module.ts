import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepotController } from './depot/depot.controller';
import { DepotEntity } from './depot/depot.entity';
import { DepotRepository } from './depot/depot.repository';
import { DepotService } from './depot/depot.service';
import { DeposerUnFichier } from './depot/usecase/deposerUnFichier';
import { SharedModule } from '@shared/shared.module';
import { InfraModule } from '@infra/infra.module';
import { SandreService } from './controle/technique/sandre/sandre.service';
import { SandreMockService } from './controle/technique/sandre/sandre.mock.service';
import { ReponseSandreEntity } from './controle/technique/sandre/reponseSandre.entity';
import { ReponseSandreRepository } from './controle/technique/sandre/reponseSandre.repository';
import { ControleSandreService } from './controle/technique/sandre/sandre.controle';
import { LoggerService } from '@shared/logger/logger.service';
import { UserModule } from '@user/user.module';

const logger = new LoggerService('DossierModule');
const sandreServiceFactory = {
  provide: SandreService,
  useFactory: (): SandreService => {
    const useMock = process.env.USE_SANDRE_MOCK === 'true';
    if (useMock) {
      logger.warn('MOCK SANDRE - Using SandreMockService');
      return new SandreMockService() as unknown as SandreService;
    }
    logger.log('Using SandreService');
    return new SandreService();
  },
};

@Module({
  imports: [TypeOrmModule.forFeature([DepotEntity, ReponseSandreEntity]), SharedModule, InfraModule, UserModule],
  controllers: [DepotController],
  providers: [
    // Depot
    DepotRepository,
    DepotService,
    DeposerUnFichier,
    // Sandre control
    sandreServiceFactory,
    ReponseSandreRepository,
    ControleSandreService,
  ],
  exports: [DepotService, ControleSandreService, ReponseSandreRepository],
})
export class DossierModule {}
