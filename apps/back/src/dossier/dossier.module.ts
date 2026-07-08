import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepotController } from './depot/depot.controller';
import { DepotEntity } from './depot/depot.entity';
import { DepotRepository } from './depot/depot.repository';
import { DepotService } from './depot/depot.service';
import { DroitsDepotService } from './depot/droitsDepot.service';
import { DeposerUnFichier } from './depot/usecase/deposerUnFichier';
import { InfraModule } from '@infra/infra.module';
import { SandreService } from './controle/technique/sandre/sandre.service';
import { SandreMockService } from './controle/technique/sandre/sandre.mock.service';
import { ReponseSandreEntity } from './controle/technique/sandre/reponseSandre.entity';
import { ReponseSandreRepository } from './controle/technique/sandre/reponseSandre.repository';
import { ReponseSandreGateway } from './controle/technique/sandre/reponseSandre.gateway';
import { LoggerService } from '@shared/logger/logger.service';
import { UserModule } from '@user/user.module';
import { ReferentielModule } from '@referentiel/referentiel.module';
import { ControleV1Service } from './controle/isov1/controlev1.service';
import { ControleV1DataFetcherService } from './controle/isov1/controleV1DataFetcher.service';
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
import { MasaModule } from '@masa/masa.module';
import { MasaGateway } from './masa/masa.gateway';
import { MasaRepository } from './masa/masa.repository';
import { MasaApiKeyGuard } from './masa/masaApiKey.guard';
import { MasaIpGuard } from './masa/masaIp.guard';
import { IsAdminGuard } from '@authentication/isAdmin.guard';
import { RapportPdfGeneratorService } from './rapport/rapportPdfGenerator.service';
import { ControleMetierV2Service } from './controle/metierv2/controleMetierV2.service';
import { ControleMetierV2Pfas } from './controle/metierv2/controleMetierV2Pfas';

const sandreServiceFactory = {
  provide: SandreService,
  inject: [LoggerService],
  useFactory: (logger: LoggerService): SandreService => {
    logger.setContext('SandreServiceFactory');
    const useMock = process.env.USE_SANDRE_MOCK === 'true';
    if (useMock) {
      logger.warn('MOCK SANDRE - Using SandreMockService');
      return new SandreMockService(logger) as unknown as SandreService;
    }
    logger.log('Using SandreService');
    return new SandreService(logger);
  },
};

@Module({
  imports: [
    TypeOrmModule.forFeature([DepotEntity, ReponseSandreEntity, ControleEntity, MasaEntity]),
    InfraModule,
    UserModule,
    ReferentielModule,
    MasaModule,
  ],
  controllers: [DepotController, DepotAdminController, ControleController, MasaController],
  providers: [
    // Depot
    { provide: DepotGateway, useClass: DepotRepository },
    DepotService,
    DroitsDepotService,
    DepotCoordinatorService,
    DeposerUnFichier,
    // Sandre control
    sandreServiceFactory,
    { provide: ReponseSandreGateway, useClass: ReponseSandreRepository },
    // ISO V1 control
    ControleV1DataFetcherService,
    ControleV1Service,
    ControleMetierV2Service,
    ControleMetierV2Pfas,
    { provide: ControleGateway, useClass: ControleRepository },
    ControleMapper,
    // Masa
    { provide: MasaGateway, useClass: MasaRepository },
    MasaService,
    MasaApiKeyGuard,
    MasaIpGuard,
    IsAdminGuard,
    RapportPdfGeneratorService,
  ],
  exports: [
    DepotService,
    DroitsDepotService,
    DepotCoordinatorService,
    SandreService,
    ReponseSandreGateway,
    ControleV1Service,
    ControleMetierV2Service,
    RapportPdfGeneratorService,
    MasaGateway,
    DepotGateway,
    ControleGateway,
  ],
})
export class DossierModule {}
