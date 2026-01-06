import { useParams, Link, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { type ControleDto, type ControleSandreDto } from '@lib/dossier';
import { fetchControles, fetchControlesSandre, ApiError } from '../api/depot';
import { ControleGroup } from '../components/ControleGroup';
import { mapControlesV1ToView, mapSandreControlesToView } from './controleMapper';
import { fr } from '@codegouvfr/react-dsfr';
import { ControleSandreGroup } from '../components/ControleGroupSandre';

export type ControleLocationState = {
  numeroDepotVerseau1?: string;
};

export function ControlePage() {
  const { depotId } = useParams<{ depotId: string }>();
  const location = useLocation();
  const state: ControleLocationState = location.state;
  const numeroDepot = state?.numeroDepotVerseau1 || depotId;
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
      <div className="fr-py-6w">
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

  const controlesV1 = mapControlesV1ToView(controles);
  const sandreControlesMapped = mapSandreControlesToView(sandreControles);

  return (
    <div className="fr-pb-6w">
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
        <div className="fr-col-12">
          <h1>Résultats des contrôles</h1>
          <p className={fr.cx('fr-text--lead')}>
            Dépôt : <span className="fr-badge fr-badge--info fr-badge--no-icon">{numeroDepot}</span>
          </p>
        </div>
      </div>

      {/* Accordion pour les contrôles V1 */}
      {controlesV1.length > 0 && (
        <div className={fr.cx('fr-mb-4w')}>
          <ControleGroup title="Contrôles métiers" controles={controlesV1} />
        </div>
      )}

      {/* Accordion pour les contrôles Sandre */}
      {sandreControlesMapped.length > 0 && (
        <div className={fr.cx('fr-mb-4w')}>
          <ControleSandreGroup title="Contrôles SANDRE" controles={sandreControlesMapped} />
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
