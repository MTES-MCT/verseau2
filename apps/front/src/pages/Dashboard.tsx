import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table } from '@codegouvfr/react-dsfr/Table'
import { Badge } from '@codegouvfr/react-dsfr/Badge'
import { Alert } from '@codegouvfr/react-dsfr/Alert'
import type { Depot, DepotStatus } from '../types/depot'
import { fetchDepots, ApiError } from '../api/depot'

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
  const [depots, setDepots] = useState<Depot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDepots() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchDepots()
        setDepots(data)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Erreur ${err.status}: ${err.message}`)
        } else {
          setError('Une erreur est survenue lors du chargement des dépôts')
        }
        console.error('Error loading depots:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDepots()
  }, [])

  if (loading) {
    return (
      <div className="fr-container fr-py-6w">
        <p>Chargement des dépôts...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fr-container fr-py-6w">
        <Alert
          severity="error"
          title="Erreur"
          description={error}
        />
      </div>
    )
  }

  const tableData = depots.map((depot) => [
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
    <div className="fr-container fr-py-6w">
      <h1>Suivi des bilans déposés</h1>
      
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
  )
}
