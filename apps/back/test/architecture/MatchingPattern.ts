export enum MatchingPattern {
  // Generic class name suffixes (for haveSimpleNameEndingWith)
  GATEWAY_SUFFIX = 'gateway.ts',
  REPOSITORY_SUFFIX = 'repository.ts',
  CONTROLLER_SUFFIX = 'controller.ts',
  SERVICE_SUFFIX = 'service.ts',
  ENTITY_SUFFIX = 'entity.ts',
  PROVIDER_SUFFIX = 'provider.ts',
  FACTORY_SUFFIX = 'factory.ts',
  PRODUCER_SUFFIX = 'producer.ts',
  PROCESSOR_SUFFIX = 'processor',
  MODULE_SUFFIX = 'module.ts',
  MODEL_SUFFIX = 'model.ts',
  USECASE_SUFFIX = '', // UseCase files (e.g., deposerUnFichier.ts)

  // Module patterns
  DOSSIER = 'src.dossier..',
  DOSSIER_CONTROLE = 'src.dossier.controle..',
  DOSSIER_DEPOT = 'src.dossier.depot..',
  DOSSIER_MASA = 'src.dossier.masa..',
  DOSSIER_RAPPORT = 'src.dossier.rapport..',

  AUTHENTICATION = 'src.authentication..',
  USER = 'src.user..',
  REFERENTIEL = 'src.referentiel..',
  REFERENTIEL_LANCELEAU = 'src.referentiel.lanceleau..',
  REFERENTIEL_ROSEAU = 'src.referentiel.roseau..',
  REFERENTIEL_PARAMETRE = 'src.referentiel.parametre..',

  NOTIFICATION = 'src.notification..',
  WORKER = 'src.worker..',
  INFRA = 'src.infra..',
  INFRA_DATABASE = 'src.infra.database..',
  INFRA_QUEUE = 'src.infra.queue..',
  INFRA_S3 = 'src.infra.s3..',
  INFRA_SFTP = 'src.infra.sftp..',
  INFRA_CONFIG = 'src.infra.config..',

  SHARED = 'src.shared..',
  API = 'src.api..',

  // External dependencies
  NESTJS_COMMON = '@nestjs.common',
  NESTJS_CONFIG = '@nestjs.config',
  NESTJS_TESTING = '@nestjs.testing',
  NESTJS_TYPEORM = '@nestjs.typeorm',
  TYPEORM = 'typeorm',
  FORMDATA = 'form-data',
  AXIOS = 'axios',

  // Internal packages
  PACKAGES_PARSER = 'packages.parser..',
  PACKAGES_DOSSIER = 'packages.dossier..',
}
