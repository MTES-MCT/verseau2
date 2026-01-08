import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { type MasaDto, MasaStatus } from '@lib/dossier';

type MasaIntegrationTableProps = {
  title: string;
  masa: MasaDto | null;
};

function getMasaBadge(statut: MasaStatus) {
  switch (statut) {
    case MasaStatus.INTEGRE:
      return (
        <Badge severity="success" small>
          Intégré
        </Badge>
      );
    case MasaStatus.INTEGRATION_PARTIELLE:
      return (
        <Badge severity="warning" small>
          Intégration partielle
        </Badge>
      );
    case MasaStatus.REFUSE:
      return (
        <Badge severity="error" small>
          Refusé
        </Badge>
      );
  }
}

export function MasaIntegrationTable({ title, masa }: MasaIntegrationTableProps) {
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

      <div className={fr.cx('fr-mb-2w')}>
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-6">
            <div className={fr.cx('fr-callout')}>
              <h3 className={fr.cx('fr-callout__title', 'fr-text--lg')}>Statut d'intégration</h3>
              <div className={fr.cx('fr-mt-1w')}>{getMasaBadge(masa.statut)}</div>
            </div>
          </div>

          {masa.numeroDepotVerseau1 && (
            <div className="fr-col-12 fr-col-md-6">
              <div className={fr.cx('fr-callout')}>
                <h3 className={fr.cx('fr-callout__title', 'fr-text--lg')}>Numéro de dépôt Verseau 1</h3>
                <p className={fr.cx('fr-mt-1w', 'fr-mb-0')}>
                  <span className="fr-badge fr-badge--info fr-badge--no-icon">{masa.numeroDepotVerseau1}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

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

export default MasaIntegrationTable;
