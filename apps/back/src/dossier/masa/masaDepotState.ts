import { DepotStatus, DepotStep } from '@lib/dossier';

/**
 * Un dépôt est en attente d'un retour MASA uniquement après un envoi SFTP réussi
 * vers l'Agent Verseau (step = SFTP_COMPLETED) et tant qu'aucune transition
 * finale n'a été appliquée (status = EN_COURS_DE_TRAITEMENT).
 * Cf. docs/depot-decision-diagram-technical.md : après SFTP_COMPLETED, le dépôt
 * attend le webhook MASA sans changement de step.
 */
export const isDepotAwaitingMasaRetour = (depot: { status?: DepotStatus | null; step?: DepotStep | null }): boolean =>
  depot.status === DepotStatus.EN_COURS_DE_TRAITEMENT && depot.step === DepotStep.SFTP_COMPLETED;

/** L'Agent Verseau peut rappeler dès la publication du .ack, avant la persistance de SFTP_COMPLETED. */
export const isDepotSendingToMasa = (depot: { status?: DepotStatus | null; step?: DepotStep | null }): boolean =>
  depot.status === DepotStatus.EN_COURS_DE_TRAITEMENT && depot.step === DepotStep.SFTP_IN_PROGRESS;
