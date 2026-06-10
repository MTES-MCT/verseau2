export enum MatchingPattern {
  // Generic class name suffixes (for haveSimpleNameEndingWith)
  GATEWAY_SUFFIX = 'gateway.ts',
  REPOSITORY_SUFFIX = 'repository.ts',
  CONTROLLER_SUFFIX = 'controller.ts',
  ENTITY_SUFFIX = 'entity.ts',
  PRODUCER_SUFFIX = 'producer.ts',
  MODULE_SUFFIX = 'module.ts',
  MODEL_SUFFIX = 'model.ts',
  MAPPER_SUFFIX = 'mapper.ts',

  // Module patterns
  INDICATEURS = 'src.indicateurs..',
  MESURES = 'src.mesures..',
  CONFORMITE = 'src.conformite..',
  SUIVI_REGULIER = 'src.suivi-regulier..',
  MASA = 'src.masa..',

  DOSSIER = 'src.dossier..',

  AUTHENTICATION = 'src.authentication..',
  USER = 'src.user..',
  REFERENTIEL = 'src.referentiel..',
  REFERENTIEL_LANCELEAU = 'src.referentiel.lanceleau..',
  REFERENTIEL_ROSEAU = 'src.referentiel.roseau..',

  NOTIFICATION = 'src.notification..',
  WORKER = 'src.worker..',
  INFRA = 'src.infra..',
}
