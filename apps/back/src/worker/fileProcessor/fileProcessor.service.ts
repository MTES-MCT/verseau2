import { Injectable, Inject } from '@nestjs/common';

import { LoggerService } from '@shared/logger/logger.service';
import { FichierDeDepot } from '@dossier/depot/file/file';
import { QueueGateway, QueueName } from '@queue/queue';
import type { Queue } from '@queue/queue';
import { DepotService } from '@dossier/depot/depot.service';
import { DroitsDepotService } from '@dossier/depot/droitsDepot.service';
import { UserService } from '@user/user.service';
import { S3 } from '@infra/s3/s3';
import { parseScenarioAssainissementXml, FctAssainissement } from '@lib/parser';
import { DepotStep, DepotStatus, EtapeMetier, ControleSandreStatus, ControleStatus } from '@lib/dossier';
import { DepotError } from '@dossier/depot/depotError';
import { AsyncTask } from '@worker/asyncTask';

@Injectable()
export class FileProcessorService implements AsyncTask<FichierDeDepot> {
  constructor(
    @Inject(QueueGateway) private readonly queueService: Queue,
    private readonly depotService: DepotService,
    private readonly droitsDepotService: DroitsDepotService,
    private readonly userService: UserService,
    @Inject(S3) private readonly s3: S3,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(FileProcessorService.name);
  }

  async process(fichierDeDepot: FichierDeDepot) {
    await this.depotService.update(fichierDeDepot.depotId, {
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      step: DepotStep.CONTROLE_IN_PROGRESS,
      etapeMetier: EtapeMetier.CONTROLE_REFERENTIEL,
      controleStatus: ControleStatus.PENDING,
      controleSandreStatus: ControleSandreStatus.PENDING,
    });

    try {
      this.logger.log(`Depot ${fichierDeDepot.depotId} - Downloading file from S3`);
      const xmlBuffer = await this.s3.download(fichierDeDepot.filePath);
      const xmlContent = xmlBuffer.toString('utf8');

      this.logger.log(`Depot ${fichierDeDepot.depotId} - Parsing XML`);
      const parsed = await parseScenarioAssainissementXml(xmlContent);
      const codes = this.extractAllCodes(parsed);

      this.logger.log(`Depot ${fichierDeDepot.depotId} - Checking deposit rights`);
      const user = await this.userService.findById(fichierDeDepot.utilisateur.id);
      if (!user.sub) {
        throw new Error("L'utilisateur n'a pas de sub renseigné, impossible de vérifier les droits");
      }

      try {
        await this.droitsDepotService.validateDroits(
          user.sub,
          codes.cdOuvrageDepollutionList,
          codes.cdSystemeCollecteList,
        );
      } catch (rightsError) {
        this.logger.warn(`Depot ${fichierDeDepot.depotId} - Rights check failed: ${rightsError.message}`);
        await this.depotService.update(fichierDeDepot.depotId, {
          status: DepotStatus.REJETE,
          error: DepotError.DROITS_INSUFFISANTS,
          step: DepotStep.CONTROLE_FAILED,
        });
        return;
      }

      this.logger.log(`Depot ${fichierDeDepot.depotId} - Dispatching controls to queues`);

      // Dispatch to both control queues
      await Promise.all([
        this.queueService.send(QueueName.controle_metier, {
          depotId: fichierDeDepot.depotId,
          filePath: fichierDeDepot.filePath,
        }),
        this.queueService.send(QueueName.controle_sandre, {
          depotId: fichierDeDepot.depotId,
          filePath: fichierDeDepot.filePath,
        }),
      ]);

      this.logger.log(`Depot ${fichierDeDepot.depotId} - Controls dispatched successfully`);
    } catch (error: unknown) {
      this.logger.error(`Depot ${fichierDeDepot.depotId} - Unexpected error during processing`, error);
      await this.depotService.update(fichierDeDepot.depotId, {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_FAILED,
      });
      throw error;
    }
  }

  private extractAllCodes(parsed: FctAssainissement): {
    cdOuvrageDepollutionList: string[];
    cdSystemeCollecteList: string[];
  } {
    const cdOuvrageDepollutionList = new Set<string>();
    const cdSystemeCollecteList = new Set<string>();
    parsed.ouvrages?.forEach((o) => {
      if (o.cdOuvrageDepollution) cdOuvrageDepollutionList.add(o.cdOuvrageDepollution);
    });
    parsed.systemesCollecte?.forEach((s) => {
      if (s.cdSystemeCollecte) cdSystemeCollecteList.add(s.cdSystemeCollecte);
    });
    return {
      cdOuvrageDepollutionList: Array.from(cdOuvrageDepollutionList),
      cdSystemeCollecteList: Array.from(cdSystemeCollecteList),
    };
  }
}
