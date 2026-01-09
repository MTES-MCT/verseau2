import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { type MasaDto, MasaStatus } from '@lib/dossier';

type MasaIntegrationStatusProps = {
  title: string;
  masa: MasaDto | null;
};

export function MasaIntegrationStatus({ title, masa }: MasaIntegrationStatusProps) {
  if (!masa) {
    return (
      <div>
        <h2 className={fr.cx('fr-h4', 'fr-mb-2w')}>{title}</h2>
        <Alert
          severity="info"
          title="Aucune donnée d'intégration"
          description="Les données d'intégration vers Verseau 1 ne sont pas encore disponibles pour ce dépôt."
          small
        />
      </div>
    );
  }

  return (
    <div>
      <h2 className={fr.cx('fr-h4', 'fr-mb-2w')}>{title}</h2>

      {masa.rapport && (
        <Accordion
          label="Rapport d'intégration"
          defaultExpanded={masa.statut === MasaStatus.REFUSE || masa.statut === MasaStatus.INTEGRATION_PARTIELLE}
        >
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem' }}>{masa.rapport}</div>
        </Accordion>
      )}
    </div>
  );
}

export default MasaIntegrationStatus;
