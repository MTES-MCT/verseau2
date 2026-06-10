/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
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
  const srcRoot = join(process.cwd(), 'src');

  const toPosix = (path: string) => path.split('\\').join('/');

  const collectFiles = (directory: string, predicate: (filePath: string) => boolean): string[] => {
    if (!existsSync(directory)) {
      return [];
    }

    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(path, predicate);
      }

      return predicate(path) ? [path] : [];
    });
  };

  const readSourceFile = (filePath: string): string => readFileSync(filePath, 'utf8');

  const toPascalCase = (value: string): string =>
    value.replace(/(^|[-_])([a-zA-Z0-9])/g, (_, _separator: string, character: string) => character.toUpperCase());

  const relativeSourcePath = (filePath: string): string => toPosix(relative(process.cwd(), filePath));

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
          .resideInAnyPackage(MatchingPattern.USER, MatchingPattern.DOSSIER, MatchingPattern.REFERENTIEL)
          .and()
          .haveSimpleNameEndingWith(MatchingPattern.ENTITY_SUFFIX)
          .should()
          .onlyHaveDependentClassesThat() as any
      )
        .givenWith(
          TypeScriptClass.simpleNameEndingWith(MatchingPattern.REPOSITORY_SUFFIX)
            .or(TypeScriptClass.simpleNameEndingWith(MatchingPattern.ENTITY_SUFFIX))
            .or(TypeScriptClass.simpleNameEndingWith(MatchingPattern.MODULE_SUFFIX))
            .or(TypeScriptClass.simpleNameEndingWith(MatchingPattern.GATEWAY_SUFFIX))
            .or(TypeScriptClass.simpleNameEndingWith(MatchingPattern.MODEL_SUFFIX))
            .or(TypeScriptClass.simpleNameEndingWith(MatchingPattern.MAPPER_SUFFIX))
            .or(TypeScriptClass.simpleNameEndingWith('mock.service.ts')),
        )
        .because(
          'Entity files should only be imported by modules, repositories, gateways, mappers, models, mock services and other entities',
        )
        .check(srcProject.allClasses());
    });

    it('Repositories should implement their matching gateway and be registered as providers', () => {
      const repositoryFiles = collectFiles(srcRoot, (filePath) => filePath.endsWith('.repository.ts'));
      const moduleSources = collectFiles(srcRoot, (filePath) => filePath.endsWith('.module.ts')).map(readSourceFile);

      const errors = repositoryFiles.flatMap((filePath) => {
        const baseName = basename(filePath, '.repository.ts');
        const repositoryName = `${toPascalCase(baseName)}Repository`;
        const gatewayName = `${toPascalCase(baseName)}Gateway`;
        const source = readSourceFile(filePath);
        const fileErrors: string[] = [];

        if (
          !new RegExp(`export\\s+class\\s+${repositoryName}\\b[^{]*\\bimplements\\s+${gatewayName}\\b`).test(source)
        ) {
          fileErrors.push(`missing export class ${repositoryName} implements ${gatewayName}`);
        }

        const providerPattern = new RegExp(
          `\\{\\s*provide:\\s*${gatewayName}\\s*,\\s*useClass:\\s*${repositoryName}\\s*\\}`,
        );
        if (!moduleSources.some((moduleSource) => providerPattern.test(moduleSource))) {
          fileErrors.push(`missing module provider { provide: ${gatewayName}, useClass: ${repositoryName} }`);
        }

        return fileErrors.map((error) => `${relativeSourcePath(filePath)}: ${error}`);
      });

      expect(errors).toEqual([]);
    });

    it('Masa-backed modules should not use direct Roseau or Lanceleau gateways', () => {
      noClasses()
        .that()
        .resideInAnyPackage(
          MatchingPattern.CONFORMITE,
          MatchingPattern.MESURES,
          MatchingPattern.SUIVI_REGULIER,
          MatchingPattern.INDICATEURS,
        )
        .should()
        .dependOnClassesThat()
        .resideInAnyPackage(MatchingPattern.REFERENTIEL_ROSEAU, MatchingPattern.REFERENTIEL_LANCELEAU)
        .because('Masa-backed modules should use MasaProvider instead of direct Roseau or Lanceleau gateways')
        .check(srcProject.allClasses());
    });
  });

  describe('Dossier Module', () => {
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
    it('Processor services should implement AsyncTask', () => {
      const processorFiles = collectFiles(join(srcRoot, 'worker'), (filePath) =>
        /processor\.service\.ts$/i.test(filePath),
      );
      const errors = processorFiles
        .filter((filePath) => !/implements\s+AsyncTask\b/.test(readSourceFile(filePath)))
        .map((filePath) => `${relativeSourcePath(filePath)} should implement AsyncTask`);

      expect(errors).toEqual([]);
    });
  });

  describe('Controllers or Endpoints', () => {
    // Endpoints excluded from guard check (with justification)
    const excludedEndpoints: Set<string> = new Set([
      'checkDroitsDeDepot',
      'uploadFile',
      'listMyDepots',
      'findParametresByCodes',
    ]);

    it('Should be protected by guard except AuthenticationController, VersionController and documented endpoints', () => {
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
        TypeScriptClass.simpleNameStartingWith('authentication').or(TypeScriptClass.simpleNameStartingWith('version')),
      );

      classes()
        .thatWithPredicate(isController.and(exceptControllerAndEndpoint))
        .shouldWithConjunction(beProtectedByGuard)
        .allowEmptyShould(false)
        .because(
          'All controllers should be protected by @UseGuards, except AuthenticationController, VersionController and documented unguarded endpoints',
        )
        .check(srcProject.allClasses());
    });
  });
});
