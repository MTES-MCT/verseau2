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

// Les statuts non finaux ne décident pas de l'issue du dépôt.
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
