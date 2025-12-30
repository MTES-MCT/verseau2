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
import { ReponseSandreGateway } from './controle/technique/sandre/reponseSandre.gateway';
import { ControleSandreService } from './controle/technique/sandre/sandre.controle';
import { LoggerService } from '@shared/logger/logger.service';
import { UserModule } from '@user/user.module';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { ControleV1Service } from './controle/isov1/controlev1.service';
import { ControleEntity } from './controle/controle.entity';
import { ControleRepository } from './controle/controle.repository';
import { ControleGateway } from './controle/controle.gateway';
import { ControleMapper } from './controle/isov1/controle.mapper';
import { DepotAdminController } from './depot/depotAdmin.controller';
import { DepotGateway } from './depot/depot.gateway';
import { ControleController } from './controle/controle.controller';
import { DepotCoordinatorService } from './depot/depotCoordinator.service';
import { MasaEntity } from './masa/masa.entity';
import { MasaController } from './masa/masa.controller';
import { MasaService } from './masa/masa.service';
import { MasaGateway } from './masa/masa.gateway';
import { MasaRepository } from './masa/masa.repository';
import { MasaApiKeyGuard } from './masa/masaApiKey.guard';
import { MasaIpGuard } from './masa/masaIp.guard';
import { RapportPdfGeneratorService } from './rapport/rapportPdfGenerator.service';
import { ControleMetierV2Service } from './controle/metierv2/controleMetierV2.service';

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
  imports: [
    TypeOrmModule.forFeature([DepotEntity, ReponseSandreEntity, ControleEntity, MasaEntity]),
    SharedModule,
    InfraModule,
    UserModule,
    ReferentielModule,
  ],
  controllers: [DepotController, DepotAdminController, ControleController, MasaController],
  providers: [
    // Depot
    { provide: DepotGateway, useClass: DepotRepository },
    DepotService,
    DepotCoordinatorService,
    DeposerUnFichier,
    // Sandre control
    sandreServiceFactory,
    { provide: ReponseSandreGateway, useClass: ReponseSandreRepository },
    ControleSandreService,
    // ISO V1 control
    ControleV1Service,
    ControleMetierV2Service,
    { provide: ControleGateway, useClass: ControleRepository },
    ControleMapper,
    // Masa
    { provide: MasaGateway, useClass: MasaRepository },
    MasaService,
    MasaApiKeyGuard,
    MasaIpGuard,
    RapportPdfGeneratorService,
  ],
  exports: [
    DepotService,
    DepotCoordinatorService,
    ControleSandreService,
    ControleV1Service,
    ControleMetierV2Service,
    RapportPdfGeneratorService,
    MasaGateway,
    DepotGateway,
    ControleGateway,
  ],
})
export class DossierModule {}
