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

export const mapWebhookStatusToMasaStatus = (statut: MasaWebhookStatus): MasaStatus => {
  switch (statut) {
    case MasaWebhookStatus.INTEGRE:
    case MasaWebhookStatus.ARCHIVE_ACCEPTE:
      return MasaStatus.INTEGRE;
    case MasaWebhookStatus.ARCHIVE_ACCEPTE_PARTIELLEMENT:
      return MasaStatus.INTEGRATION_PARTIELLE;
    case MasaWebhookStatus.INITIALISE:
    case MasaWebhookStatus.ARCHIVE_NON_ACCEPTE:
    case MasaWebhookStatus.DEPOSE:
    case MasaWebhookStatus.REJETE:
    case MasaWebhookStatus.INTEGRABLE:
    case MasaWebhookStatus.A_INTEGRER:
    case MasaWebhookStatus.ARCHIVE_REJETE:
    case MasaWebhookStatus.ERREUR_BLOQUANTE:
      return MasaStatus.REFUSE;
  }
};
