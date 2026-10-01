import { ControleSandreStatus, ControleStatus, DepotStatus, DepotStep, EtapeMetier } from '@lib/dossier';
import { DepotError } from './depotError';

export interface DepotWorkflowState {
  status: DepotStatus;
  step?: DepotStep;
  stepHistory?: DepotStep[];
  controleStatus?: ControleStatus;
  controleSandreStatus?: ControleSandreStatus;
  etapeMetier?: EtapeMetier;
  error?: DepotError;
}

export type SandreValidationFailure =
  DepotError.SANDRE_UPLOAD_FAILED | DepotError.SANDRE_POLL_TIMEOUT | DepotError.SANDRE_POLL_FAILED;

export type DepotWorkflowTransition =
  | { type: 'startProcessing' }
  | { type: 'completeBusinessControls'; success: boolean }
  | { type: 'failBusinessControls' }
  | { type: 'startSandreValidation' }
  | { type: 'completeSandreValidation'; isConformant: boolean }
  | { type: 'failSandreValidation'; error: SandreValidationFailure }
  | { type: 'startSftpTransfer' }
  | { type: 'completeSftpTransfer' }
  | { type: 'failSftpTransfer' };

type StateChanges = Partial<Omit<DepotWorkflowState, 'stepHistory'>>;

function changeState<T extends DepotWorkflowState>(depot: T, fromSteps: DepotStep[], changes: StateChanges): T | null {
  if (depot.status !== DepotStatus.EN_COURS_DE_TRAITEMENT || !depot.step || !fromSteps.includes(depot.step)) {
    return null;
  }
  let stepHistory = depot.stepHistory?.slice();
  if (changes.step !== undefined && changes.step !== depot.step) {
    stepHistory = [...(stepHistory ?? []), changes.step];
  }
  return { ...depot, ...changes, stepHistory };
}

/** Pure state rules: no persistence, transactions, or queue decisions. */
export function applyDepotTransition<T extends DepotWorkflowState>(
  depot: T,
  transition: DepotWorkflowTransition,
): T | null {
  switch (transition.type) {
    case 'startProcessing':
      return changeState(depot, [DepotStep.PENDING, DepotStep.UPLOADING_TO_S3], {
        step: DepotStep.CONTROLE_IN_PROGRESS,
        etapeMetier: EtapeMetier.CONTROLE_REFERENTIEL,
        controleStatus: ControleStatus.PENDING,
      });
    case 'completeBusinessControls':
      return changeState(depot, [DepotStep.CONTROLE_IN_PROGRESS], {
        status: transition.success ? DepotStatus.EN_COURS_DE_TRAITEMENT : DepotStatus.REJETE,
        controleStatus: transition.success ? ControleStatus.SUCCESS : ControleStatus.FAILED,
        step: transition.success ? DepotStep.CONTROLE_COMPLETED : DepotStep.CONTROLE_FAILED,
        etapeMetier: transition.success ? EtapeMetier.CONTROLE_METIER : EtapeMetier.CONTROLE_REFERENTIEL,
      });
    case 'failBusinessControls':
      return changeState(depot, [DepotStep.CONTROLE_IN_PROGRESS], {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_FAILED,
        controleStatus: ControleStatus.FAILED,
        error: DepotError.CONTROLE_METIER_TECHNICAL_FAILURE,
      });
    case 'startSandreValidation':
      if (
        depot.controleStatus !== ControleStatus.SUCCESS ||
        (depot.controleSandreStatus && depot.controleSandreStatus !== ControleSandreStatus.PENDING)
      ) {
        return null;
      }
      return changeState(depot, [DepotStep.CONTROLE_COMPLETED, DepotStep.PARSER_SANDRE_IN_PROGRESS], {
        step: DepotStep.PARSER_SANDRE_IN_PROGRESS,
        controleSandreStatus: ControleSandreStatus.PENDING,
      });
    case 'completeSandreValidation':
      return changeState(depot, [DepotStep.PARSER_SANDRE_IN_PROGRESS], {
        status: transition.isConformant ? DepotStatus.EN_COURS_DE_TRAITEMENT : DepotStatus.REJETE,
        controleSandreStatus: transition.isConformant ? ControleSandreStatus.SUCCESS : ControleSandreStatus.FAILED,
        step: transition.isConformant ? DepotStep.READY_FOR_SFTP : DepotStep.CONTROLE_SANDRE_FAILED,
        etapeMetier: transition.isConformant ? EtapeMetier.FINALISATION_IMPORT : EtapeMetier.CONTROLE_METIER,
      });
    case 'failSandreValidation':
      return changeState(depot, [DepotStep.PARSER_SANDRE_IN_PROGRESS], {
        status: DepotStatus.REJETE,
        step: DepotStep.CONTROLE_SANDRE_FAILED,
        controleSandreStatus: ControleSandreStatus.FAILED,
        error: transition.error,
      });
    case 'startSftpTransfer':
      return changeState(depot, [DepotStep.READY_FOR_SFTP, DepotStep.SFTP_IN_PROGRESS], {
        step: DepotStep.SFTP_IN_PROGRESS,
        etapeMetier: EtapeMetier.FINALISATION_IMPORT,
      });
    case 'completeSftpTransfer':
      return changeState(depot, [DepotStep.SFTP_IN_PROGRESS], { step: DepotStep.SFTP_COMPLETED });
    case 'failSftpTransfer':
      return changeState(depot, [DepotStep.SFTP_IN_PROGRESS], {
        status: DepotStatus.REJETE,
        step: DepotStep.SFTP_FAILED,
      });
  }
}
