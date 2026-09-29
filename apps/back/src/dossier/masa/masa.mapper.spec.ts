import { MasaStatus } from '@lib/dossier';
import { MasaWebhookStatus } from './masa.model';
import { mapMasaModelToDto, mapWebhookStatusToMasaStatus } from './masa.mapper';

describe('masa.mapper', () => {
  describe('mapWebhookStatusToMasaStatus', () => {
    describe('final statuses keep their decision mapping', () => {
      it.each([
        [MasaWebhookStatus.INTEGRE, MasaStatus.INTEGRE],
        [MasaWebhookStatus.ARCHIVE_ACCEPTE, MasaStatus.INTEGRE],
        [MasaWebhookStatus.ARCHIVE_ACCEPTE_PARTIELLEMENT, MasaStatus.INTEGRATION_PARTIELLE],
        [MasaWebhookStatus.REJETE, MasaStatus.REFUSE],
        [MasaWebhookStatus.ARCHIVE_NON_ACCEPTE, MasaStatus.REFUSE],
        [MasaWebhookStatus.ARCHIVE_REJETE, MasaStatus.REFUSE],
        [MasaWebhookStatus.ERREUR_BLOQUANTE, MasaStatus.REFUSE],
      ])('maps %s to %s', (statut, expected) => {
        expect(mapWebhookStatusToMasaStatus(statut)).toBe(expected);
      });
    });

    describe('non-final (in-flight) statuses must not decide the depot outcome', () => {
      it.each([
        MasaWebhookStatus.INITIALISE,
        MasaWebhookStatus.DEPOSE,
        MasaWebhookStatus.INTEGRABLE,
        MasaWebhookStatus.A_INTEGRER,
      ])('maps %s to null (no decision yet)', (statut) => {
        expect(mapWebhookStatusToMasaStatus(statut)).toBeNull();
      });
    });
  });

  describe('mapMasaModelToDto', () => {
    it('maps a MasaModel to its DTO without statutMasa', () => {
      const masa = {
        id: 'masa_1',
        depotId: 'depot_1',
        numeroDepotVerseau1: 'V1-1',
        statut: MasaStatus.INTEGRE,
        statutMasa: MasaWebhookStatus.INTEGRE,
        rapport: '<p>rapport</p>',
        createdAt: new Date('2026-09-01T00:00:00Z'),
        updatedAt: new Date('2026-09-02T00:00:00Z'),
      };

      expect(mapMasaModelToDto(masa)).toStrictEqual({
        id: 'masa_1',
        numeroDepotVerseau1: 'V1-1',
        statut: MasaStatus.INTEGRE,
        rapport: '<p>rapport</p>',
        createdAt: masa.createdAt,
        updatedAt: masa.updatedAt,
      });
    });
  });
});
