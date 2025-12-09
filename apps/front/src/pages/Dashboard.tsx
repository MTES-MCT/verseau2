import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Table } from '@codegouvfr/react-dsfr/Table'
import { Badge } from '@codegouvfr/react-dsfr/Badge'
import { Alert } from '@codegouvfr/react-dsfr/Alert'
import type { Depot, DepotStatus } from '../types/depot'
import { fetchDepots, ApiError } from '../api/depot'
import { StatCard } from '../components/StatCard'
import { fr } from '@codegouvfr/react-dsfr'
import { Button } from "@codegouvfr/react-dsfr/Button";


function getStatusBadge(status: DepotStatus) {
  switch (status) {
    case 'SUCCESS':
      return <Badge severity="success" small>Valide</Badge>
    case 'FAILED':
      return <Badge severity="error" small>Écarte</Badge>
    case 'PROCESSING':
      return <Badge severity="info" small>En cours</Badge>
    case 'PENDING':
      return <Badge severity="warning" small>En attente</Badge>
    default:
      return <Badge small>{status}</Badge>
  }
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Dashboard() {
  const {
    data: depots = [],
    isLoading,
    error,
  } = useQuery<Depot[], ApiError>({
    queryKey: ['depots'],
    queryFn: fetchDepots,
  })

  const errorMessage = error
    ? error instanceof ApiError
      ? `Erreur ${error.status}: ${error.message}`
      : 'Une erreur est survenue lors du chargement des dépôts'
    : null

  if (isLoading) {
    return (
      <div className="fr-container fr-py-6w">
        <p>Chargement des dépôts...</p>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="fr-container fr-py-6w">
        <Alert
          severity="error"
          title="Erreur"
          description={errorMessage}
        />
      </div>
    )
  }

  const tableData = depots.map((depot: Depot) => [
    depot.id,
    depot.nomOriginalFichier,
    getStatusBadge(depot.status),
    depot.step,
    depot.createdAt ? formatDate(depot.createdAt) : '-',
    <Link to={`/controle/${depot.id}`} className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline">
      Voir
    </Link>
  ])

  return (
    <>
      <div className="fr-mb-4w">
        <div style={{ backgroundColor: 'var(--background-action-high-blue-france)', height: '40px' }} className="fr-mb-1w"></div>
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--middle fr-mb-2w" style={{ borderBottom: '2px solid black', paddingBottom: '1rem' }}>
            <div className="fr-col">
              <h2 className="fr-h4 fr-mb-0">
                <span className={fr.cx("ri-dashboard-2-line")} aria-hidden="true"></span>
                Autosurveillance des systèmes d'assainissement — Tableau de bord
              </h2>
            </div>
            <div className="fr-col-auto">
               <Button
                    type="button"
                    iconId="ri-upload-2-line"
                >
                Déposer vos données d'autosurveillance

                </Button>
              {/* <button className="fr-btn fr-btn--secondary fr-icon-upload-line fr-btn--icon-left">
              </button> */}
            </div>
          </div>
        </div>

        <div className="fr-container fr-mb-4w">
          <div className="fr-grid-row fr-grid-row--gutters">
            
            <StatCard count={depots.length} label="Bilans déposés" icon={fr.cx("ri-folder-2-line")} />
            
            <StatCard count="1" label="Bilans en attente" icon={fr.cx("ri-hourglass-line")} />

            <StatCard count="1" label="Bilans écartés par le SPE" icon={fr.cx("ri-prohibited-2-line")} />
          </div>
        </div>
      </div>

      <div className="fr-container fr-py-2w">
        <div className="fr-mb-2w">
          <p className="fr-text--sm">
            Affichage de {depots.length} entrée{depots.length > 1 ? 's' : ''}
          </p>
        </div>

        <Table
          caption="Liste des dépôts d'auto-surveillance"
          noCaption
          bordered
          headers={['#', 'Fichier', 'Statut', 'Étape', 'Déposé le', 'Actions']}
          data={tableData}
        />
      </div>
    </>
  )
}
