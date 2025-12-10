import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { S3 } from '@s3/s3';
import { AsyncTask } from '@worker/asyncTask';
import { ControleSandreService } from '@dossier/controle/technique/sandre/sandre.controle';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus, ControleSandreStatus } from '@lib/dossier';
import { DepotCoordinatorService } from '@dossier/depot/depotCoordinator.service';
import { FichierDeDepot } from '@dossier/depot/file/file';

@Injectable()
export class ControleSandreProcessorService implements AsyncTask<{ depotId: string; filePath: string }> {
  private readonly logger = new LoggerService(ControleSandreProcessorService.name);

  constructor(
    @Inject(S3) private readonly s3: S3,
    private readonly controleSandreService: ControleSandreService,
    private readonly depotService: DepotService,
    private readonly depotCoordinatorService: DepotCoordinatorService,
  ) {}

  async process({ depotId, filePath }: { depotId: string; filePath: string }): Promise<void> {
    await this.depotService.update(depotId, {
      status: DepotStatus.PROCESSING,
      step: DepotStep.CONTROLE_SANDRE_IN_PROGRESS,
    });

    try {
      this.logger.log(`Depot ${depotId} - Downloading file for SANDRE control`, filePath);
      const file = await this.s3.download(filePath);
      this.logger.log(`Depot ${depotId} - File downloaded for SANDRE control`, {
        fileSize: `${Math.round((file.length / 1024 / 1024) * 100) / 100} MB`,
      });

      const fichierDeDepot: FichierDeDepot = {
        depotId,
        filePath,
        utilisateur: {
          nom: '',
          prenom: '',
        },
      };

      this.logger.log(`Depot ${depotId} - Parser SANDRE en cours`);
      const sandreControle = await this.controleSandreService.execute(file, fichierDeDepot);

      // If already processed, consider it successful
      const isSuccess = sandreControle === null || sandreControle.isConformant;

      this.logger.log(`Depot ${depotId} - Parser SANDRE result`, {
        acceptationStatus: sandreControle?.acceptationStatus,
        isConformant: sandreControle?.isConformant,
        success: isSuccess,
      });

      // Update depot with SANDRE control result
      await this.depotService.update(depotId, {
        controleSandreStatus: isSuccess ? ControleSandreStatus.SUCCESS : ControleSandreStatus.FAILED,
        step: isSuccess ? DepotStep.CONTROLE_SANDRE_COMPLETED : DepotStep.CONTROLE_SANDRE_FAILED,
      });

      // Check if both controls are complete and coordinate next step
      await this.depotCoordinatorService.checkControlesCompletion(depotId);
    } catch (error) {
      this.logger.error(`Depot ${depotId} - Controle SANDRE failed`, error);
      await this.depotService.update(depotId, {
        status: DepotStatus.FAILED,
        step: DepotStep.CONTROLE_SANDRE_FAILED,
        controleSandreStatus: ControleSandreStatus.FAILED,
      });
      throw error;
    }
  }
}
