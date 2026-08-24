import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { type MasaDto, MasaStatus } from '@lib/dossier';
import { formatAgentVerseauReport } from '@lib/shared';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Table } from '@codegouvfr/react-dsfr/Table';
import './ControleGroup.css';
import type { ControleFilterSet } from '../types/controle.types';
import { matchesMasaFilters } from '../helper/controleFilterHelper';

type MasaIntegrationStatusProps = {
  title: string;
  masa: MasaDto | null;
  activeFilters: ControleFilterSet;
};

export function MasaIntegrationStatus({ title, masa, activeFilters }: MasaIntegrationStatusProps) {
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

  if (!matchesMasaFilters(masa, activeFilters)) {
    return null;
  }

  const statusLabel = getStatusLabel(masa.statut);
  const statusBadgeSeverity = getStatusBadgeSeverity(masa.statut);
  const rapportContent = masa.rapport ? (
    <Accordion
      label="Rapport d'intégration"
      defaultExpanded={masa.statut === MasaStatus.REFUSE || masa.statut === MasaStatus.INTEGRATION_PARTIELLE}
    >
      <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem' }}>
        {formatAgentVerseauReport(masa.rapport)}
      </div>
    </Accordion>
  ) : (
    <Alert
      severity="info"
      title="Aucun rapport d'intégration"
      description="Aucun rapport d'intégration n'est disponible pour ce dépôt."
      small
    />
  );

  return (
    <div>
      <h2 className={fr.cx('fr-h4', 'fr-mb-2w')}>{title}</h2>

      <div className="controle-table-container">
        <Table
          headers={['Contrôle', 'Résultat', 'Message']}
          data={[
            [
              'Intégration Verseau 1',
              <Badge severity={statusBadgeSeverity} small>
                {statusLabel}
              </Badge>,
              rapportContent,
            ],
          ]}
          className={fr.cx('fr-mb-4w')}
        />
      </div>
    </div>
  );
}

function getStatusLabel(statut: MasaStatus): string {
  switch (statut) {
    case MasaStatus.INTEGRE:
      return 'Succès';
    case MasaStatus.INTEGRATION_PARTIELLE:
      return 'Avertissement';
    case MasaStatus.REFUSE:
      return 'Erreur';
  }
}

function getStatusBadgeSeverity(statut: MasaStatus): 'success' | 'warning' | 'error' {
  switch (statut) {
    case MasaStatus.INTEGRE:
      return 'success';
    case MasaStatus.INTEGRATION_PARTIELLE:
      return 'warning';
    case MasaStatus.REFUSE:
      return 'error';
  }
}

export default MasaIntegrationStatus;
