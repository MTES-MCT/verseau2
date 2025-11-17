import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SandreService } from './sandre/sandre.service';
import { SandreMockService } from './sandre/sandre.mock.service';
import { ReponseSandreEntity } from './sandre/reponseSandre.entity';
import { ReponseSandreRepository } from './sandre/reponseSandre.repository';
import { DepotRepository } from '@depot/depot/depot.repository';
import { DepotModule } from '@depot/depot.module';
import { LoggerService } from '@shared/logger/logger.service';

const logger = new LoggerService('ReferentielModule');
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
  imports: [TypeOrmModule.forFeature([ReponseSandreEntity]), DepotModule],
  providers: [sandreServiceFactory, ReponseSandreRepository, DepotRepository],
  exports: [SandreService, ReponseSandreRepository],
})
export class ReferentielModule {}
