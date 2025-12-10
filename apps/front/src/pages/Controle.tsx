import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { type ControleDto, type ControleSandreDto } from '@lib/dossier';
import { fetchControles, fetchControlesSandre, ApiError } from '../api/depot';
import { ControleGroup } from '../components/ControleGroup';
import { mapSandreControles } from './controle.mappers';
import { fr } from '@codegouvfr/react-dsfr';

export function ControlePage() {
  const { depotId } = useParams<{ depotId: string }>();
  const {
    data: controles = [],
    isLoading,
    error,
  } = useQuery<ControleDto[], ApiError>({
    queryKey: ['controles', depotId],
    queryFn: () => fetchControles(depotId!),
    enabled: Boolean(depotId),
  });

  const {
    data: sandreControles = [],
    isLoading: isLoadingSandre,
    error: errorSandre,
  } = useQuery<ControleSandreDto[], ApiError>({
    queryKey: ['controles-sandre', depotId],
    queryFn: () => fetchControlesSandre(depotId!),
    enabled: Boolean(depotId),
  });

  const errorMessage = error
    ? error instanceof ApiError
      ? `Erreur ${error.status}: ${error.message}`
      : 'Une erreur est survenue lors du chargement des contrôles'
    : null;

  const errorSandreMessage = errorSandre
    ? errorSandre instanceof ApiError
      ? `Erreur ${errorSandre.status}: ${errorSandre.message}`
      : 'Une erreur est survenue lors du chargement des contrôles SANDRE'
    : null;

  if (isLoading || isLoadingSandre) {
    return (
      <div className="fr-container fr-py-6w">
        <p>Chargement des contrôles...</p>
      </div>
    );
  }

  if (errorMessage || errorSandreMessage) {
    return (
      <div className="fr-container fr-py-6w">
        <Link to="/" className="fr-link fr-mb-2w" style={{ display: 'inline-block' }}>
          ← Retour au dashboard
        </Link>
        {errorMessage && <Alert severity="error" title="Erreur" description={errorMessage} />}
        {errorSandreMessage && (
          <Alert severity="error" title="Erreur" description={errorSandreMessage} className="fr-mt-2w" />
        )}
      </div>
    );
  }

  const controlesV1 = controles;

  const successCount = controlesV1.filter((c) => c.success).length;
  const failCount = controlesV1.length - successCount;

  const sandreControlesMapped = mapSandreControles(sandreControles);

  return (
    <div className="fr-container fr-py-6w">
      <Link to="/" className="fr-link fr-mb-2w" style={{ display: 'inline-block' }}>
        ← Retour au dashboard
      </Link>

      <h1>Contrôles du dépôt</h1>
      <p className="fr-text--lead">{depotId}</p>

      <div className="fr-mb-4w">
        <Badge severity="success" className="fr-mr-1w">
          {successCount} succès
        </Badge>
        <Badge severity="error">
          {failCount} échec{failCount > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Accordion pour les contrôles V1 */}
      {controlesV1.length > 0 &&  <div className={fr.cx("fr-mb-4w")}> <ControleGroup title="Contrôle V1" controles={controlesV1} /></div>}

      {/* Accordion pour les contrôles Sandre */}
      {sandreControlesMapped.length > 0 && (
        <div className={fr.cx("fr-mb-4w")}>
          <ControleGroup title="Contrôle SANDRE" controles={sandreControlesMapped} />
        </div>
      )}

      {/* Afficher un message si aucun contrôle n'est trouvé */}
      {controlesV1.length === 0 && sandreControlesMapped.length === 0 && (
        <Alert
          severity="info"
          title="Aucun contrôle trouvé"
          description="Aucun contrôle n'a été trouvé pour ce dépôt."
        />
      )}
    </div>
  );
}
