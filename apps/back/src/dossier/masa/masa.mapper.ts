import { MasaDto, MasaStatus } from '@lib/dossier';
import { MasaModel, MasaWebhookStatus } from './masa.model';

export const mapMasaModelToDto = (masa: MasaModel): MasaDto => {
  return {
    id: masa.id,
    numeroDepotVerseau1: masa.numeroDepotVerseau1,
    statut: masa.statut,
    rapport: masa.rapport,
    createdAt: masa.createdAt,
    updatedAt: masa.updatedAt,
  };
};

/**
 * Mappe un statut webhook MASA vers la décision à appliquer au dépôt.
 *
 * Les statuts non finaux (en cours de traitement côté MASA : Initialisé, Déposé,
 * Intégrable, A intégrer) ne doivent PAS décider du sort du dépôt : ils mappent
 * vers `null` afin d'être acquittés sans persister de retour ni transitionner le
 * dépôt, ce qui laisse un statut final ultérieur s'appliquer. Seuls les statuts
 * finaux (Intégré, Archivé - Accepté / Accepté partiellement, Rejeté,
 * Archivé - Non accepté / Rejeté, Erreur bloquante) portent une décision.
 */
export const mapWebhookStatusToMasaStatus = (statut: MasaWebhookStatus): MasaStatus | null => {
  switch (statut) {
    case MasaWebhookStatus.INTEGRE:
    case MasaWebhookStatus.ARCHIVE_ACCEPTE:
      return MasaStatus.INTEGRE;
    case MasaWebhookStatus.ARCHIVE_ACCEPTE_PARTIELLEMENT:
      return MasaStatus.INTEGRATION_PARTIELLE;
    case MasaWebhookStatus.REJETE:
    case MasaWebhookStatus.ARCHIVE_NON_ACCEPTE:
    case MasaWebhookStatus.ARCHIVE_REJETE:
    case MasaWebhookStatus.ERREUR_BLOQUANTE:
      return MasaStatus.REFUSE;
    case MasaWebhookStatus.INITIALISE:
    case MasaWebhookStatus.DEPOSE:
    case MasaWebhookStatus.INTEGRABLE:
    case MasaWebhookStatus.A_INTEGRER:
      return null;
  }
};
