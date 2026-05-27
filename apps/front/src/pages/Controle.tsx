import { Fragment, useMemo, useState, type ReactElement } from 'react';
import { useParams, Link, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { fetchControles, fetchControlesSandre, fetchMasa } from '../api/depot';
import { ApiError } from '../api/apiClient';
import { ControleGroup } from '../components/ControleGroup';
import { mapControlesV1ToView, mapSandreControlesToView } from './controleMapper';
import { fr } from '@codegouvfr/react-dsfr';
import { ControleSandreGroup } from '../components/ControleGroupSandre';
import { MasaIntegrationStatus } from '../components/MasaIntegrationStatus';
import { ClickableStatCard } from '../components/ClickableStatCard';
import type { ControleFilterSet, ControleFilterType } from '../types/controle.types';
import { useControleStatistics } from '../hooks/useControleStatistics';
import {
  defaultActiveControleFilters,
  filterControlesByActiveFilters,
  filterSandreControlesByActiveFilters,
  getMasaStatistics,
  getSandreStatistics,
  matchesMasaFilters,
} from '../helper/controleFilterHelper';

export type ControleLocationState = {
  numeroDepotVerseau1?: string;
};

export function ControlePage() {
  const { depotId } = useParams<{ depotId: string }>();
  const location = useLocation();
  const state: ControleLocationState = location.state;
  const numeroDepot = state?.numeroDepotVerseau1 || depotId;
  const [activeFilters, setActiveFilters] = useState<ControleFilterSet>(() => new Set(defaultActiveControleFilters));
  const {
    data: controles = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['controles', depotId],
    queryFn: () => fetchControles(depotId!),
    enabled: Boolean(depotId),
    retry: false,
  });

  const { data: sandreControles = [] } = useQuery({
    queryKey: ['controles-sandre', depotId],
    queryFn: () => fetchControlesSandre(depotId!),
    enabled: Boolean(depotId),
    retry: false,
  });

  const { data: masa = null } = useQuery({
    queryKey: ['masa', depotId],
    queryFn: () => fetchMasa(depotId!),
    enabled: Boolean(depotId),
    retry: false,
  });

  const controlesV1 = useMemo(() => mapControlesV1ToView(controles), [controles]);
  const sandreControlesMapped = useMemo(() => mapSandreControlesToView(sandreControles), [sandreControles]);
  const roseauStatistics = useControleStatistics(controlesV1);
  const sandreStatistics = useMemo(() => getSandreStatistics(sandreControlesMapped), [sandreControlesMapped]);
  const masaStatistics = useMemo(() => getMasaStatistics(masa), [masa]);
  const hasVisibleRoseauRows = filterControlesByActiveFilters(controlesV1, activeFilters).length > 0;
  const hasVisibleSandreRows = filterSandreControlesByActiveFilters(sandreControlesMapped, activeFilters).length > 0;
  const hasVisibleMasaRow = matchesMasaFilters(masa, activeFilters);
  const hasAnyResult = controlesV1.length > 0 || sandreControlesMapped.length > 0 || masa !== null;

  const visibleSections: ReactElement[] = [];

  if (hasVisibleRoseauRows) {
    visibleSections.push(
      <ControleGroup
        title="Contrôles métiers, référentiels et de cohérence des données (ROSEAU)"
        controles={controlesV1}
        activeFilters={activeFilters}
      />,
    );
  }

  if (hasVisibleSandreRows) {
    visibleSections.push(
      <ControleSandreGroup title="Contrôles SANDRE" controles={sandreControlesMapped} activeFilters={activeFilters} />,
    );
  }

  if (hasVisibleMasaRow) {
    visibleSections.push(
      <MasaIntegrationStatus title="Intégration des données" masa={masa} activeFilters={activeFilters} />,
    );
  }

  const totalSuccessCount = roseauStatistics.successCount + sandreStatistics.successCount + masaStatistics.successCount;
  const totalWarningCount = roseauStatistics.warningCount + sandreStatistics.warningCount + masaStatistics.warningCount;
  const totalErrorCount = roseauStatistics.errorCount + sandreStatistics.errorCount + masaStatistics.errorCount;

  const toggleFilter = (filter: ControleFilterType) => {
    setActiveFilters((previousFilters) => {
      const nextFilters = new Set(previousFilters);

      if (nextFilters.has(filter)) {
        nextFilters.delete(filter);
      } else {
        nextFilters.add(filter);
      }

      return nextFilters;
    });
  };

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

  console.log('visibleSections.length && activeFilters.entries.length', visibleSections.length, activeFilters.size);
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

      {hasAnyResult && (
        <div className="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <ClickableStatCard
            count={totalSuccessCount}
            label="Succès"
            icon="fr-icon-checkbox-circle-fill"
            color="var(--text-default-success)"
            onClick={() => toggleFilter('success')}
            isActive={activeFilters.has('success')}
          />
          <ClickableStatCard
            count={totalWarningCount}
            label="Avertissement"
            icon="fr-icon-warning-fill"
            color="var(--text-default-warning)"
            onClick={() => toggleFilter('warning')}
            isActive={activeFilters.has('warning')}
          />
          <ClickableStatCard
            count={totalErrorCount}
            label="Erreur"
            icon="fr-icon-error-fill"
            color="var(--text-default-error)"
            onClick={() => toggleFilter('error')}
            isActive={activeFilters.has('error')}
          />
        </div>
      )}
      {visibleSections.length === 0 && hasAnyResult ? (
        <Alert
          severity="info"
          title="Aucun contrôle trouvé"
          description="Modifier la sélection des filtres pour afficher les résultats des contrôles."
        />
      ) : null}
      {visibleSections.map((section, index) => (
        <Fragment key={index}>
          {index > 0 && <hr className="fr-separator-6v" />}
          <div
            className={fr.cx(index > 0 && 'fr-pt-4w', index === visibleSections.length - 1 ? 'fr-mb-4w' : 'fr-pb-4w')}
          >
            {section}
          </div>
        </Fragment>
      ))}

      {!hasAnyResult && (
        <Alert
          severity="info"
          title="Aucun contrôle trouvé"
          description="Aucun contrôle n'a été trouvé pour ce dépôt."
          data-testid={'no-controls-alert'}
        />
      )}
    </div>
  );
}
