/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
import { RelativePath } from 'arch-unit-ts/dist/arch-unit/core/domain/RelativePath';
import { TypeScriptProject } from 'arch-unit-ts/dist/arch-unit/core/domain/TypeScriptProject';
import { TypeScriptClass } from 'arch-unit-ts/dist/arch-unit/core/domain/TypeScriptClass';
import { DescribedPredicate } from 'arch-unit-ts/dist/arch-unit/base/DescribedPredicate';
import { ArchCondition } from 'arch-unit-ts/dist/arch-unit/lang/ArchCondition';
import { ConditionEvents } from 'arch-unit-ts/dist/arch-unit/lang/ConditionEvents';
import { SimpleConditionEvent } from 'arch-unit-ts/dist/arch-unit/lang/SimpleConditionEvent';
import { classes, noClasses } from 'arch-unit-ts/dist/main';
import { MatchingPattern } from './MatchingPattern';
import { ControllerGuardParser } from './ControllerGuardParser';

describe('Architecture test', () => {
  const srcProject = new TypeScriptProject(RelativePath.of('src'), '**/*.spec.ts'); // Ignore tests files

  describe('Generic Application Rules', () => {
    it('Repository should depend on gateway', () => {
      classes()
        .that()
        .haveSimpleNameEndingWith(MatchingPattern.REPOSITORY_SUFFIX)
        .should()
        .dependOnClassesThat()
        .haveSimpleNameEndingWith(MatchingPattern.GATEWAY_SUFFIX)
        .allowEmptyShould(true)
        .because('Repository should implement gateway')
        .check(srcProject.allClasses());
    });

    it('Controllers should not be in infra or worker modules', () => {
      noClasses()
        .that()
        .resideInAnyPackage(MatchingPattern.INFRA, MatchingPattern.WORKER)
        .should()
        .haveSimpleNameEndingWith(MatchingPattern.CONTROLLER_SUFFIX)
        .because('Controllers should only exist in domain modules, not in infra or worker')
        .check(srcProject.allClasses());
    });

    it('Entity files should only be imported by modules and repositories', () => {
      (
        classes()
          .that()
          .resideInAnyPackage(MatchingPattern.USER, MatchingPattern.DOSSIER)
          .and()
          .haveSimpleNameEndingWith(MatchingPattern.ENTITY_SUFFIX)
          .should()
          .onlyHaveDependentClassesThat() as any
      )
        .givenWith(
          TypeScriptClass.simpleNameEndingWith(MatchingPattern.REPOSITORY_SUFFIX)
            .or(TypeScriptClass.simpleNameEndingWith(MatchingPattern.ENTITY_SUFFIX))
            .or(TypeScriptClass.simpleNameEndingWith(MatchingPattern.MODULE_SUFFIX))
            .or(TypeScriptClass.simpleNameEndingWith(MatchingPattern.SERVICE_SUFFIX))
            .or(TypeScriptClass.simpleNameEndingWith(MatchingPattern.MODEL_SUFFIX))
            .or(TypeScriptClass.simpleNameEndingWith(MatchingPattern.MAPPER_SUFFIX)),
        )
        .because('Entity files should only be imported by modules, repositories, services, gateways and other entities')
        .check(srcProject.allClasses());
    });
  });

  describe('Dossier Module', () => {
    it.skip('Services should only depend on few dependencies', () => {
      (
        classes()
          .that()
          .resideInAnyPackage(MatchingPattern.USER, MatchingPattern.DOSSIER)
          .and()
          .haveSimpleNameEndingWith(MatchingPattern.SERVICE_SUFFIX)
          .should()
          .onlyDependOnClassesThat() as any
      )
        .givenWith(
          TypeScriptClass.simpleNameEndingWith(MatchingPattern.SERVICE_SUFFIX)
            .or(TypeScriptClass.simpleNameEndingWith(MatchingPattern.GATEWAY_SUFFIX))
            .or(TypeScriptClass.simpleNameEndingWith(MatchingPattern.MODEL_SUFFIX))
            .or(
              TypeScriptClass.resideInAnyPackage([
                MatchingPattern.TYPEORM,
                MatchingPattern.NESTJS_COMMON,
                MatchingPattern.SHARED,
                MatchingPattern.PACKAGES_PARSER,
                MatchingPattern.PACKAGES_DOSSIER,
                MatchingPattern.INFRA_QUEUE,
                MatchingPattern.INFRA_S3,
                MatchingPattern.FORMDATA,
                MatchingPattern.AXIOS,
              ]),
            ),
        )
        .because('Services should only depend on: services, gateways , nestjs common, typeorm, shared and packages')
        .check(srcProject.allClasses());
    });

    it('Controllers should depend on services or usecases', () => {
      classes()
        .that()
        .resideInAPackage(MatchingPattern.DOSSIER)
        .and()
        .haveSimpleNameEndingWith(MatchingPattern.CONTROLLER_SUFFIX)
        .should()
        .dependOnClassesThat()
        .resideInAPackage(MatchingPattern.DOSSIER)
        .allowEmptyShould(true)
        .because('Controllers should depend on services or usecases within dossier module')
        .check(srcProject.allClasses());
    });

    it('Repositories should implement gateways', () => {
      classes()
        .that()
        .resideInAPackage(MatchingPattern.DOSSIER)
        .and()
        .haveSimpleNameEndingWith(MatchingPattern.REPOSITORY_SUFFIX)
        .should()
        .dependOnClassesThat()
        .haveSimpleNameEndingWith(MatchingPattern.GATEWAY_SUFFIX)
        .allowEmptyShould(false)
        .because('Dossier repositories should implement gateways')
        .check(srcProject.allClasses());
    });
  });

  describe('User Module', () => {
    it('Repositories should implement gateways', () => {
      classes()
        .that()
        .resideInAPackage(MatchingPattern.USER)
        .and()
        .haveSimpleNameEndingWith(MatchingPattern.REPOSITORY_SUFFIX)
        .should()
        .dependOnClassesThat()
        .haveSimpleNameEndingWith(MatchingPattern.GATEWAY_SUFFIX)
        .allowEmptyShould(false)
        .because('User repositories should implement gateways')
        .check(srcProject.allClasses());
    });
  });

  describe('Referentiel Module', () => {
    it('Repositories should implement gateways', () => {
      classes()
        .that()
        .resideInAPackage(MatchingPattern.REFERENTIEL)
        .and()
        .haveSimpleNameEndingWith(MatchingPattern.REPOSITORY_SUFFIX)
        .should()
        .dependOnClassesThat()
        .haveSimpleNameEndingWith(MatchingPattern.GATEWAY_SUFFIX)
        .allowEmptyShould(false)
        .because('Referentiel repositories should implement gateways')
        .check(srcProject.allClasses());
    });
  });

  describe('Authentication Module', () => {
    it('Should not have repositories', () => {
      noClasses()
        .that()
        .resideInAPackage(MatchingPattern.AUTHENTICATION)
        .should()
        .haveSimpleNameEndingWith(MatchingPattern.REPOSITORY_SUFFIX)
        .because('Authentication module should not have repositories')
        .check(srcProject.allClasses());
    });
  });

  describe('Notification Module', () => {
    it('Should have producer implementing gateway', () => {
      classes()
        .that()
        .resideInAPackage(MatchingPattern.NOTIFICATION)
        .and()
        .haveSimpleNameEndingWith(MatchingPattern.PRODUCER_SUFFIX)
        .should()
        .dependOnClassesThat()
        .haveSimpleNameEndingWith(MatchingPattern.GATEWAY_SUFFIX)
        .allowEmptyShould(false)
        .because('Notification producer should implement gateway')
        .check(srcProject.allClasses());
    });
  });

  describe('Worker Module', () => {
    it('Processors should use services from domain modules', () => {
      classes()
        .that()
        .resideInAPackage(MatchingPattern.WORKER)
        .and()
        .haveSimpleNameEndingWith(MatchingPattern.PROCESSOR_SUFFIX)
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage(
          MatchingPattern.DOSSIER,
          MatchingPattern.REFERENTIEL,
          MatchingPattern.NOTIFICATION,
          MatchingPattern.SHARED,
          MatchingPattern.INFRA,
        )
        .allowEmptyShould(true)
        .because('Processors should use services from domain modules')
        .check(srcProject.allClasses());
    });

    it('Should not have controllers', () => {
      noClasses()
        .that()
        .resideInAPackage(MatchingPattern.WORKER)
        .should()
        .haveSimpleNameEndingWith(MatchingPattern.CONTROLLER_SUFFIX)
        .because('Worker module should not have controllers')
        .check(srcProject.allClasses());
    });
  });

  describe('Infra Module', () => {
    it('Should not have controllers', () => {
      noClasses()
        .that()
        .resideInAPackage(MatchingPattern.INFRA)
        .should()
        .haveSimpleNameEndingWith(MatchingPattern.CONTROLLER_SUFFIX)
        .because('Infra module should not have controllers')
        .check(srcProject.allClasses());
    });
  });

  describe('Controllers or Endpoints', () => {
    // Endpoints excluded from guard check (with justification)
    const excludedEndpoints: Set<string> = new Set(['checkDroitsDeDepot', 'uploadFile', 'listMyDepots']);

    it('Should be protected by guard except AuthenticationController, ReferentielController and VersionController', () => {
      const beProtectedByGuard = new (class extends ArchCondition<TypeScriptClass> {
        constructor() {
          super('be protected by @UseGuards (at class or method level)');
        }

        check(item: TypeScriptClass, events: ConditionEvents): void {
          const parser = new ControllerGuardParser(item.getPath().get());

          if (parser.hasClassLevelGuard()) {
            events.add(
              new SimpleConditionEvent(`${item.getSimpleName()} is protected by class-level @UseGuards`, false),
            );
            return;
          }

          const endpoints = parser.findEndpoints();

          if (endpoints.length === 0) {
            events.add(new SimpleConditionEvent(`${item.getSimpleName()} has no HTTP endpoints`, false));
            return;
          }

          const unprotectedEndpoints = endpoints.filter(
            (endpoint) => !excludedEndpoints.has(endpoint.methodName) && !parser.endpointHasGuard(endpoint),
          );

          if (unprotectedEndpoints.length > 0) {
            const details = unprotectedEndpoints.map((e) => e.methodName).join(', ');
            events.add(
              SimpleConditionEvent.violated(
                `${item.getSimpleName()} has ${unprotectedEndpoints.length} unprotected endpoint(s): [${details}] in ${item.getPath().get()}`,
              ),
            );
          } else {
            events.add(
              new SimpleConditionEvent(`${item.getSimpleName()} has all endpoints protected by @UseGuards`, false),
            );
          }
        }
      })();

      const isController = TypeScriptClass.simpleNameEndingWith(MatchingPattern.CONTROLLER_SUFFIX);
      const exceptControllerAndEndpoint = DescribedPredicate.not(
        TypeScriptClass.simpleNameStartingWith('authentication')
          .or(TypeScriptClass.simpleNameStartingWith('referentiel'))
          .or(TypeScriptClass.simpleNameStartingWith('version')),
      );

      classes()
        .thatWithPredicate(isController.and(exceptControllerAndEndpoint))
        .shouldWithConjunction(beProtectedByGuard)
        .allowEmptyShould(false)
        .because(
          'All controllers should be protected by @UseGuards, except AuthenticationController, ReferentielController and VersionController',
        )
        .check(srcProject.allClasses());
    });
  });
});
