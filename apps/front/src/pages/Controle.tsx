import { useParams, Link, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { type ControleDto, type ControleSandreDto, type MasaDto } from '@lib/dossier';
import { fetchControles, fetchControlesSandre, fetchMasa, ApiError } from '../api/depot';
import { ControleGroup } from '../components/ControleGroup';
import { mapControlesV1ToView, mapSandreControlesToView } from './controleMapper';
import { fr } from '@codegouvfr/react-dsfr';
import { ControleSandreGroup } from '../components/ControleGroupSandre';
import { MasaIntegrationStatus } from '../components/MasaIntegrationStatus';

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
    retry: false,
  });

  const { data: sandreControles = [] } = useQuery<ControleSandreDto[], ApiError>({
    queryKey: ['controles-sandre', depotId],
    queryFn: () => fetchControlesSandre(depotId!),
    enabled: Boolean(depotId),
    retry: false,
  });

  const { data: masa = null } = useQuery<MasaDto | null, ApiError>({
    queryKey: ['masa', depotId],
    queryFn: () => fetchMasa(depotId!),
    enabled: Boolean(depotId),
    retry: false,
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
      <div className="fr-py-6w">
        <Link to="/" className="fr-link fr-mb-2w" style={{ display: 'inline-block' }}>
          ← Retour au dashboard
        </Link>
        {errorMessage && <Alert severity="error" title="Erreur" description={errorMessage} />}
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
        <div className={fr.cx('fr-pb-4w')}>
          <ControleGroup
            title="Contrôles métiers, référentiels et de cohérence des données (ROSEAU)"
            controles={controlesV1}
          />
        </div>
      )}

      <hr className="fr-separator-6v" />
      {/* Accordion pour les contrôles Sandre */}
      {sandreControlesMapped.length > 0 && (
        <div className={fr.cx('fr-pb-4w', 'fr-pt-4w')}>
          <ControleSandreGroup title="Contrôles SANDRE" controles={sandreControlesMapped} />
        </div>
      )}
      <hr className="fr-separator-6v" />

      {/* Section Intégration MASA */}
      <div className={fr.cx('fr-mb-4w', 'fr-pt-4w')}>
        <MasaIntegrationStatus title="Intégration des données" masa={masa} />
      </div>

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
