import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/logger/logger.service';
import { S3 } from '@s3/s3';
import { AsyncTask } from '@worker/asyncTask';
import { parseScenarioAssainissementXml } from '@lib/parser';
import { ControleV1Service } from '@dossier/controle/isov1/controlev1.service';
import { DepotService } from '@dossier/depot/depot.service';
import { DepotStep, DepotStatus, ControleV1Status } from '@lib/dossier';
import { DepotCoordinatorService } from '@dossier/depot/depotCoordinator.service';

@Injectable()
export class ControleV1ProcessorService implements AsyncTask<{ depotId: string; filePath: string }> {
  private readonly logger = new LoggerService(ControleV1ProcessorService.name);

  constructor(
    @Inject(S3) private readonly s3: S3,
    private readonly controleV1Service: ControleV1Service,
    private readonly depotService: DepotService,
    private readonly depotCoordinatorService: DepotCoordinatorService,
  ) {}

  async process({ depotId, filePath }: { depotId: string; filePath: string }): Promise<void> {
    await this.depotService.update(depotId, {
      status: DepotStatus.PROCESSING,
      step: DepotStep.CONTROLE_V1_IN_PROGRESS,
    });

    try {
      this.logger.log(`Depot ${depotId} - Downloading file for V1 control`, filePath);
      const file = await this.s3.download(filePath);
      this.logger.log(`Depot ${depotId} - File downloaded for V1 control`, {
        fileSize: `${Math.round((file.length / 1024 / 1024) * 100) / 100} MB`,
      });

      const xmlObj = await parseScenarioAssainissementXml(file.toString());

      this.logger.log(`Depot ${depotId} - Controle V1 en cours`);
      const controles = await this.controleV1Service.execute(depotId, xmlObj);
      const allSuccess = controles.every((controle) => controle.success);

      this.logger.log(`Depot ${depotId} - Controle V1 result`, {
        success: allSuccess,
      });

      // Update depot with V1 control result
      await this.depotService.update(depotId, {
        controleV1Status: allSuccess ? ControleV1Status.SUCCESS : ControleV1Status.FAILED,
        step: allSuccess ? DepotStep.CONTROLE_V1_COMPLETED : DepotStep.CONTROLE_V1_FAILED,
      });

      // Check if both controls are complete and coordinate next step
      await this.depotCoordinatorService.checkControlesCompletion(depotId);
    } catch (error) {
      this.logger.error(`Depot ${depotId} - Controle V1 failed`, error);
      await this.depotService.update(depotId, {
        status: DepotStatus.FAILED,
        step: DepotStep.CONTROLE_V1_FAILED,
        controleV1Status: ControleV1Status.FAILED,
      });
      throw error;
    }
  }
}
