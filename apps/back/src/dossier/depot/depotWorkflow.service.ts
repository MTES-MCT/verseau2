import { Inject, Injectable } from '@nestjs/common';
import { QueueName, RapportDestinataire, type DiffusionRapportJobData, type JobScheduler } from '@queue/queue';
import type { DepotModel } from './depot.model';
import { DepotUnitOfWork } from './depotUnitOfWork.gateway';
import {
  applyDepotTransition,
  type DepotWorkflowTransition,
  type SandreValidationFailure,
} from './depotTransitionPolicy';

@Injectable()
export class DepotWorkflowService {
  constructor(@Inject(DepotUnitOfWork) private readonly unitOfWork: DepotUnitOfWork) {}

  startProcessing(id: string): Promise<boolean> {
    return this.execute(id, { type: 'startProcessing' });
  }

  completeBusinessControls(id: string, result: { success: boolean; filePath: string }): Promise<boolean> {
    return this.execute(id, { type: 'completeBusinessControls', success: result.success }, (depot, jobs) => {
      if (result.success) {
        return jobs.enqueue(QueueName.controle_sandre_upload, { depotId: depot.id, filePath: result.filePath });
      }
      return this.scheduleReport(depot.id, jobs);
    });
  }

  failBusinessControls(id: string): Promise<boolean> {
    return this.execute(id, { type: 'failBusinessControls' });
  }

  startSandreValidation(id: string): Promise<boolean> {
    return this.execute(id, { type: 'startSandreValidation' });
  }

  completeSandreValidation(id: string, isConformant: boolean): Promise<boolean> {
    return this.execute(id, { type: 'completeSandreValidation', isConformant }, (depot, jobs) => {
      if (isConformant) {
        return jobs.enqueue(QueueName.send_to_sftp, { depotId: depot.id, filePath: depot.path ?? '' });
      }
      return this.scheduleReport(depot.id, jobs);
    });
  }

  failSandreValidation(id: string, error: SandreValidationFailure): Promise<boolean> {
    return this.execute(id, { type: 'failSandreValidation', error });
  }

  startSftpTransfer(id: string): Promise<boolean> {
    return this.execute(id, { type: 'startSftpTransfer' });
  }

  completeSftpTransfer(id: string): Promise<boolean> {
    return this.execute(id, { type: 'completeSftpTransfer' });
  }

  failSftpTransfer(id: string): Promise<boolean> {
    return this.execute(id, { type: 'failSftpTransfer' });
  }

  private scheduleReport(depotId: string, jobs: JobScheduler): Promise<string> {
    return jobs.enqueue<DiffusionRapportJobData>(QueueName.diffusion_rapport, {
      depotId,
      destinataires: [RapportDestinataire.DEPOSANT],
    });
  }

  private execute(
    id: string,
    transition: DepotWorkflowTransition,
    schedule?: (depot: DepotModel, jobs: JobScheduler) => Promise<string>,
  ): Promise<boolean> {
    return this.unitOfWork.run(async ({ depots, jobs }) => {
      const depot = await depots.findForUpdate(id);
      const next = depot ? applyDepotTransition(depot, transition) : null;
      if (!next) {
        return false;
      }
      const saved = await depots.save(next);
      if (schedule) {
        await schedule(saved, jobs);
      }
      return true;
    });
  }
}
