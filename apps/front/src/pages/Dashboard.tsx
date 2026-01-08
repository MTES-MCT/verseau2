import { Link } from 'react-router';
import { type ControleLocationState } from './Controle';

import { useQuery } from '@tanstack/react-query';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { DepotStatus, EtapeMetier, type DepotDto } from '@lib/dossier';
import { fetchDepots, ApiError } from '../api/depot';
import { StatCard } from '../components/StatCard';
import { fr } from '@codegouvfr/react-dsfr';
import { usePagination } from '../hooks/usePagination';
import { useRapportAndXmlDownload } from '../hooks/useRapportAndXmlDownload';
import { getEtapeMetierNumber, getMessageForDepotEtapeMetier } from '../services/depot.service';

const DEPOT_POLLING_INTERVAL_MS = 5000;
const PAGE_SIZE = 10;

function getStatusBadge(depot: DepotDto) {
  switch (depot.status) {
    case DepotStatus.INTEGRE:
      return (
        <Badge severity="success" small>
          Intégré
        </Badge>
      );
    case DepotStatus.INTEGRE_PARTIELLEMENT:
      return (
        <Badge severity="success" small>
          Intégré partiellement
        </Badge>
      );
    case DepotStatus.REJETE:
      return (
        <Badge severity="error" small>
          Rejeté
        </Badge>
      );
    case DepotStatus.EN_COURS_DE_TRAITEMENT:
      return (
        <Badge severity="info" small>
          En cours de traitement
        </Badge>
      );
    default:
      return <Badge small>{depot.status}</Badge>;
  }
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Dashboard() {
  const { downloadingDepotId, handleDownload, downloadingXmlId, handleDownloadXml, downloadError, setDownloadError } =
    useRapportAndXmlDownload();

  const {
    data: depots = [],
    isLoading,
    error,
  } = useQuery<DepotDto[], ApiError>({
    queryKey: ['depots'],
    queryFn: fetchDepots,
    refetchInterval: ({ state }) => {
      const hasPendingOrProcessing = state.data?.some(
        (depot: DepotDto) =>
          [EtapeMetier.CONTROLE_METIER, EtapeMetier.CONTROLE_REFERENTIEL, EtapeMetier.SCENARIO_SANDRE].includes(
            depot.etapeMetier!,
          ) && depot.status === DepotStatus.EN_COURS_DE_TRAITEMENT,
      );

      return hasPendingOrProcessing ? DEPOT_POLLING_INTERVAL_MS : false;
    },
  });

  const { currentPage, totalPages, paginatedData, getPageLinkProps } = usePagination(depots, PAGE_SIZE, 1);

  const errorMessage = error
    ? error instanceof ApiError
      ? `Erreur ${error.status}: ${error.message}`
      : 'Une erreur est survenue lors du chargement des dépôts'
    : null;

  if (isLoading) {
    return (
      <div className="fr-container fr-py-6w">
        <p>Chargement des dépôts...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="fr-container fr-py-6w">
        <Alert severity="error" title="Erreur" description={errorMessage} />
      </div>
    );
  }

  const tableData = paginatedData.map((depot: DepotDto) => [
    depot.numeroDepotVerseau1,
    depot.nomOriginalFichier,
    getStatusBadge(depot),
    `${getMessageForDepotEtapeMetier(depot.etapeMetier) ? `${getMessageForDepotEtapeMetier(depot.etapeMetier)} - ${getEtapeMetierNumber(depot.etapeMetier)}/4` : ''}`,
    depot.createdAt ? formatDate(depot.createdAt) : '-',
    <div key={depot.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Link
        to={`/controle/${depot.id}`}
        state={{ numeroDepotVerseau1: depot.numeroDepotVerseau1 } as ControleLocationState}
        className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
      >
        Voir
      </Link>
      <Button
        size="small"
        priority="tertiary no outline"
        iconId="ri-download-line"
        onClick={() => handleDownloadXml(depot.id, depot.nomOriginalFichier)}
        disabled={downloadingXmlId === depot.id}
        title="Télécharger le fichier XML"
      >
        {downloadingXmlId === depot.id ? 'XML...' : 'XML'}
      </Button>
      {depot.rapportPath && (
        <Button
          size="small"
          priority="tertiary no outline"
          iconId="ri-download-line"
          onClick={() => handleDownload(depot.id)}
          disabled={downloadingDepotId === depot.id}
          title="Télécharger le rapport PDF"
        >
          {downloadingDepotId === depot.id ? 'Rapport...' : 'Rapport'}
        </Button>
      )}
    </div>,
  ]);

  return (
    <>
      <div>
        <div className="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div className="fr-col-12 fr-col-md-4">
            <StatCard count={depots.length} label="Fichiers déposés" icon={fr.cx('ri-folder-2-line')} />
          </div>
          <div className="fr-col-12 fr-col-md-4">
            <StatCard
              count={depots.filter((depot: DepotDto) => depot.status === DepotStatus.EN_COURS_DE_TRAITEMENT).length}
              label="Fichiers en cours"
              icon={fr.cx('ri-hourglass-line')}
            />
          </div>
          <div className="fr-col-12 fr-col-md-4">
            <StatCard
              count={depots.filter((depot: DepotDto) => depot.status === DepotStatus.REJETE).length}
              label="Fichiers rejetés"
              icon={fr.cx('ri-prohibited-2-line')}
            />
          </div>
        </div>
      </div>

      <div className={fr.cx('fr-py-2w')}>
        <div className="fr-mb-2w">
          <p className="fr-text--sm">
            Affichage de {(currentPage - 1) * PAGE_SIZE + 1} à {Math.min(currentPage * PAGE_SIZE, depots.length)} sur{' '}
            {depots.length} entrée{depots.length > 1 ? 's' : ''}
          </p>
        </div>

        {downloadError && (
          <div className="fr-mb-2w">
            <Alert
              severity="error"
              title="Erreur de téléchargement"
              description={downloadError}
              closable
              onClose={() => setDownloadError(null)}
            />
          </div>
        )}
        <Table
          caption="Liste des dépôts d'auto-surveillance"
          noCaption
          bordered
          headers={['Numéro de dépôt', 'Fichier', 'Statut', 'Étape', 'Déposé le', 'Actions']}
          data={tableData}
          noScroll={false}
        />

        {totalPages > 1 && (
          <div className="fr-mt-4w">
            <Pagination
              count={totalPages}
              defaultPage={currentPage}
              getPageLinkProps={getPageLinkProps}
              showFirstLast={true}
            />
          </div>
        )}
      </div>
    </>
  );
}
