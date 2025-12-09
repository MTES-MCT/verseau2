import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import type { Controle } from '../types/depot';
import { fetchControles, ApiError } from '../api/depot';

function getResultBadge(success: boolean) {
  return success ? (
    <Badge severity="success" small>
      Succès
    </Badge>
  ) : (
    <Badge severity="error" small>
      Échec
    </Badge>
  );
}

export function ControlePage() {
  const { depotId } = useParams<{ depotId: string }>();
  const {
    data: controles = [],
    isLoading,
    error,
  } = useQuery<Controle[], ApiError>({
    queryKey: ['controles', depotId],
    queryFn: () => fetchControles(depotId!),
    enabled: Boolean(depotId),
  });

  const errorMessage = error
    ? error instanceof ApiError
      ? `Erreur ${error.status}: ${error.message}`
      : 'Une erreur est survenue lors du chargement des contrôles'
    : null;

  if (isLoading) {
    return (
      <div className="fr-container fr-py-6w">
        <p>Chargement des contrôles...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="fr-container fr-py-6w">
        <Link to="/" className="fr-link fr-mb-2w" style={{ display: 'inline-block' }}>
          ← Retour au dashboard
        </Link>
        <Alert severity="error" title="Erreur" description={errorMessage} />
      </div>
    );
  }

  const successCount = controles.filter((c) => c.success).length;
  const failCount = controles.length - successCount;

  const tableData = controles.map((controle) => [
    controle.name,
    getResultBadge(controle.success),
    controle.error || '-',
    controle.errorParams?.join(', ') || '-',
  ]);

  return (
    <div className="fr-container fr-py-6w">

      <Link to="/" className="fr-link fr-mb-2w" style={{ display: 'inline-block' }}>
        ← Retour au dashboard
      </Link>

      <h1>Contrôles du dépôt</h1>
      <p className="fr-text--lead">{depotId}</p>

      <div className="fr-mb-2w">
        <Badge severity="success" className="fr-mr-1w">
          {successCount} succès
        </Badge>
        <Badge severity="error">
          {failCount} échec{failCount > 1 ? 's' : ''}
        </Badge>
      </div>

      <Table
        caption="Liste des contrôles"
        noCaption
        bordered
        headers={['Contrôle', 'Résultat', 'Code erreur', 'Paramètres']}
        data={tableData}
        fixed={true}
      />
    </div>
  );
}
