import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { AsyncTask } from '@worker/asyncTask';
import { SandreService } from '@dossier/controle/technique/sandre/sandre.service';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, ControleSandreStatus, EtapeMetier, SandreAcceptationStatus } from '@lib/dossier';
import { DepotError } from '@dossier/depot/depotError';
import { ReponseSandreGateway } from '@dossier/controle/technique/sandre/reponseSandre.gateway';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { DepotCoordinatorService } from '@dossier/depot/depotCoordinator.service';
import { mapSandreErrors } from '@dossier/controle/technique/sandre/sandre.mapper';

const POLL_INTERVAL_SECONDS = 30;
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
            step: DepotStep.CONTROLE_SANDRE_FAILED,
            controleSandreStatus: ControleSandreStatus.FAILED,
            error: DepotError.SANDRE_POLL_TIMEOUT,
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
      const errors = mapSandreErrors(validationResult.ACQ.AccuseReception);

      this.logger.log(`Depot ${depotId} - SANDRE validation result`, {
        acceptationStatus,
        isConformant,
        jeton: validationResult.ACQ.AccuseReception.Jeton,
        codeScenario: validationResult.ACQ.AccuseReception.CodeScenario,
        versionScenario: validationResult.ACQ.AccuseReception.VersionScenario,
        errorsCount: errors.length,
      });

      // Create reponse_sandre with final result
      await this.reponseSandreGateway.createReponseSandre({
        depotId,
        jeton,
        acceptationStatus,
        isConformant,
        codeScenario: validationResult.ACQ.AccuseReception.CodeScenario,
        versionScenario: validationResult.ACQ.AccuseReception.VersionScenario,
        errors,
        raw: validationResult,
      });

      // Update depot with SANDRE control result
      await this.depotService.update(depotId, {
        controleSandreStatus: isConformant ? ControleSandreStatus.SUCCESS : ControleSandreStatus.FAILED,
        step: isConformant ? DepotStep.CONTROLE_SANDRE_COMPLETED : DepotStep.CONTROLE_SANDRE_FAILED,
        etapeMetier: isConformant ? EtapeMetier.SCENARIO_SANDRE : EtapeMetier.CONTROLE_METIER,
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
        step: DepotStep.CONTROLE_SANDRE_FAILED,
        controleSandreStatus: ControleSandreStatus.FAILED,
        error: DepotError.SANDRE_POLL_FAILED,
      });

      await this.depotCoordinatorService.checkControlesCompletion(depotId);
    }
  }
}
