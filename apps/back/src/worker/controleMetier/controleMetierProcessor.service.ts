import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { S3 } from '@s3/s3';
import { AsyncTask } from '@worker/asyncTask';
import { parseScenarioAssainissementXml } from '@lib/parser';
import { ControleMetierService } from '@dossier/controle/metier/controleMetier.service';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus, ControleStatus } from '@lib/dossier';
import { DepotCoordinatorService } from '@dossier/depot/depotCoordinator.service';

@Injectable()
export class ControleMetierProcessorService implements AsyncTask<{ depotId: string; filePath: string }> {
  private readonly logger = new LoggerService(ControleMetierProcessorService.name);

  constructor(
    @Inject(S3) private readonly s3: S3,
    private readonly controleMetierService: ControleMetierService,
    private readonly depotService: DepotService,
    private readonly depotCoordinatorService: DepotCoordinatorService,
  ) {}

  async process({ depotId, filePath }: { depotId: string; filePath: string }): Promise<void> {
    await this.depotService.update(depotId, {
      status: DepotStatus.PROCESSING,
      step: DepotStep.CONTROLE_IN_PROGRESS,
    });

    try {
      this.logger.log(`Depot ${depotId} - Downloading file for Metier control`, filePath);
      const file = await this.s3.download(filePath);
      this.logger.log(`Depot ${depotId} - File downloaded for Metier control`, {
        fileSize: `${Math.round((file.length / 1024 / 1024) * 100) / 100} MB`,
      });

      const xmlObj = await parseScenarioAssainissementXml(file.toString());

      this.logger.log(`Depot ${depotId} - Controle Metier en cours`);
      const controles = await this.controleMetierService.execute(depotId, xmlObj);
      const allSuccess = controles.every((controle) => controle.success);

      this.logger.log(`Depot ${depotId} - Controle Metier result`, {
        success: allSuccess,
      });

      // Update depot with Metier control result
      await this.depotService.update(depotId, {
        controleStatus: allSuccess ? ControleStatus.SUCCESS : ControleStatus.FAILED,
        step: allSuccess ? DepotStep.CONTROLE_COMPLETED : DepotStep.CONTROLE_FAILED,
      });

      // Check if all controls are complete and coordinate next step
      await this.depotCoordinatorService.checkControlesCompletion(depotId);
    } catch (error) {
      this.logger.error(`Depot ${depotId} - Controle Metier failed`, error);
      await this.depotService.update(depotId, {
        status: DepotStatus.FAILED,
        step: DepotStep.CONTROLE_FAILED,
        controleStatus: ControleStatus.FAILED,
      });
      throw error;
    }
  }
}
