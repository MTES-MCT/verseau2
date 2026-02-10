import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { AsyncTask } from '@worker/asyncTask';
import { SandreService } from '@dossier/controle/technique/sandre/sandre.service';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus, ControleSandreStatus, EtapeMetier, SandreAcceptationStatus } from '@lib/dossier';
import { ReponseSandreGateway } from '@dossier/controle/technique/sandre/reponseSandre.gateway';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { DepotCoordinatorService } from '@dossier/depot/depotCoordinator.service';
import type { SandreValidationError } from '@dossier/controle/technique/sandre/sandre';

const POLL_INTERVAL_SECONDS = 2;
const MAX_ATTEMPTS = 240; // 240 * 30s = 2 hours

@Injectable()
export class ControleSandrePollProcessorService implements AsyncTask<{
  depotId: string;
  jeton: string;
  attemptCount: number;
}> {
  constructor(
    private readonly sandreService: SandreService,
    private readonly depotService: DepotService,
    @Inject(ReponseSandreGateway) private readonly reponseSandreGateway: ReponseSandreGateway,
    @Inject(QueueGateway) private readonly queueService: Queue,
    private readonly depotCoordinatorService: DepotCoordinatorService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ControleSandrePollProcessorService.name);
  }

  async process({
    depotId,
    jeton,
    attemptCount,
  }: {
    depotId: string;
    jeton: string;
    attemptCount: number;
  }): Promise<void> {
    this.logger.log(`Depot ${depotId} - Polling SANDRE validation result`, {
      jeton,
      attemptCount,
      maxAttempts: MAX_ATTEMPTS,
    });

    try {
      // Poll the validation result from SANDRE
      const validationResult = await this.sandreService.getValidationResult(jeton);
      const acceptationStatus = Number(validationResult.ACQ.AccuseReception.Acceptation) as SandreAcceptationStatus;

      this.logger.log(`Depot ${depotId} - SANDRE validation status`, {
        jeton,
        acceptationStatus,
        attemptCount,
      });

      // Check if still waiting or processing
      if (
        acceptationStatus === SandreAcceptationStatus.WAITING ||
        acceptationStatus === SandreAcceptationStatus.PROCESSING
      ) {
        if (attemptCount >= MAX_ATTEMPTS) {
          this.logger.error(`Depot ${depotId} - SANDRE polling timeout after ${attemptCount} attempts`, {
            jeton,
            maxAttempts: MAX_ATTEMPTS,
          });

          // Mark as failed due to timeout
          await this.depotService.update(depotId, {
            status: DepotStatus.REJETE,
            step: DepotStep.CONTROLE_SANDRE_FAILED,
            controleSandreStatus: ControleSandreStatus.FAILED,
          });

          await this.depotCoordinatorService.checkControlesCompletion(depotId);
          return;
        }

        // Re-enqueue poll job with incremented attemptCount
        this.logger.log(`Depot ${depotId} - Re-enqueuing poll job`, {
          jeton,
          nextAttempt: attemptCount + 1,
          startAfter: POLL_INTERVAL_SECONDS,
        });

        await this.queueService.send(
          QueueName.controle_sandre_poll,
          { depotId, jeton, attemptCount: attemptCount + 1 },
          { startAfter: POLL_INTERVAL_SECONDS },
        );

        return; // Job terminates here, will be re-executed later
      }

      // Result is final (CONFORMANT or NON_CONFORMANT) - process and finalize
      const isConformant = acceptationStatus === SandreAcceptationStatus.CONFORMANT;

      // Extract error information if present
      const rawErreur = validationResult.ACQ.AccuseReception.Erreur;
      const globalSeverity = validationResult.ACQ.AccuseReception['Erreur@attributes']?.SeveriteErreur;

      let errors: SandreValidationError[] = [];

      if (Array.isArray(rawErreur)) {
        errors = rawErreur.map((item) => {
          if ('Erreur' in item) {
            const nested = item;
            return {
              code: nested.Erreur.CdErreur,
              message: nested.Erreur.DescriptifErreur,
              location: nested.Erreur.LocationErreur,
              ligne: nested.Erreur.LigneErreur,
              colonne: nested.Erreur.ColonneErreur,
              severite:
                nested.Erreur['@attributes']?.SeveriteErreur ??
                nested['Erreur@attributes']?.SeveriteErreur ??
                globalSeverity,
            };
          } else {
            const simple = item;
            return {
              code: simple.CdErreur,
              message: simple.DescriptifErreur,
              location: simple.LocationErreur,
              ligne: simple.LigneErreur,
              colonne: simple.ColonneErreur,
              severite: simple['@attributes']?.SeveriteErreur ?? globalSeverity,
            };
          }
        });
      } else if (rawErreur) {
        const simple = rawErreur;
        errors = [
          {
            code: simple.CdErreur,
            message: simple.DescriptifErreur,
            location: simple.LocationErreur,
            ligne: simple.LigneErreur,
            colonne: simple.ColonneErreur,
            severite: simple['@attributes']?.SeveriteErreur ?? globalSeverity,
          },
        ];
      }

      this.logger.log(`Depot ${depotId} - SANDRE validation result`, {
        acceptationStatus,
        isConformant,
        jeton: validationResult.ACQ.AccuseReception.Jeton,
        codeScenario: validationResult.ACQ.AccuseReception.CodeScenario,
        versionScenario: validationResult.ACQ.AccuseReception.VersionScenario,
        errorsCount: errors.length,
      });

      // Update reponse_sandre with final result
      const existingResponse = await this.reponseSandreGateway.findByJeton(jeton);
      if (existingResponse) {
        await this.reponseSandreGateway.updateReponseSandre(existingResponse.id, {
          acceptationStatus,
          isConformant,
          codeScenario: validationResult.ACQ.AccuseReception.CodeScenario,
          versionScenario: validationResult.ACQ.AccuseReception.VersionScenario,
          errors,
          raw: validationResult,
        });
      }

      // Update depot with SANDRE control result
      await this.depotService.update(depotId, {
        controleSandreStatus: isConformant ? ControleSandreStatus.SUCCESS : ControleSandreStatus.FAILED,
        step: isConformant ? DepotStep.CONTROLE_SANDRE_COMPLETED : DepotStep.CONTROLE_SANDRE_FAILED,
        etapeMetier: isConformant ? EtapeMetier.SCENARIO_SANDRE : EtapeMetier.CONTROLE_METIER,
        ...(isConformant ? {} : { status: DepotStatus.REJETE }),
      });

      // Check if both controls are complete and coordinate next step
      await this.depotCoordinatorService.checkControlesCompletion(depotId);

      this.logger.log(`Depot ${depotId} - Poll job completed`, {
        isConformant,
        controleSandreStatus: isConformant ? ControleSandreStatus.SUCCESS : ControleSandreStatus.FAILED,
      });
    } catch (error) {
      this.logger.error(`Depot ${depotId} - SANDRE poll failed`, error);

      // If we haven't exhausted attempts, re-enqueue
      if (attemptCount < MAX_ATTEMPTS) {
        this.logger.log(`Depot ${depotId} - Error during poll, re-enqueuing`, {
          jeton,
          attemptCount: attemptCount + 1,
        });

        await this.queueService.send(
          QueueName.controle_sandre_poll,
          { depotId, jeton, attemptCount: attemptCount + 1 },
          { startAfter: POLL_INTERVAL_SECONDS },
        );

        return;
      }

      // Max attempts reached, mark as failed
      await this.depotService.update(depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_SANDRE_FAILED,
        controleSandreStatus: ControleSandreStatus.FAILED,
      });

      throw error;
    }
  }
}
