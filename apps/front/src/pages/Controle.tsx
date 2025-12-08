import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Table } from '@codegouvfr/react-dsfr/Table'
import { Badge } from '@codegouvfr/react-dsfr/Badge'
import { Alert } from '@codegouvfr/react-dsfr/Alert'
import type { Controle } from '../types/depot'
import { fetchControles, ApiError } from '../api/depot'

function getResultBadge(success: boolean) {
  return success 
    ? <Badge severity="success" small>Succès</Badge>
    : <Badge severity="error" small>Échec</Badge>
}

export function ControlePage() {
  const { depotId } = useParams<{ depotId: string }>()
  const [controles, setControles] = useState<Controle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadControles() {
      if (!depotId) return

      try {
        setLoading(true)
        setError(null)
        const data = await fetchControles(depotId)
        setControles(data)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Erreur ${err.status}: ${err.message}`)
        } else {
          setError('Une erreur est survenue lors du chargement des contrôles')
        }
        console.error('Error loading controles:', err)
      } finally {
        setLoading(false)
      }
    }

    loadControles()
  }, [depotId])

  if (loading) {
    return (
      <div className="fr-container fr-py-6w">
        <p>Chargement des contrôles...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fr-container fr-py-6w">
        <Link to="/" className="fr-link fr-mb-2w" style={{ display: 'inline-block' }}>
          ← Retour au dashboard
        </Link>
        <Alert
          severity="error"
          title="Erreur"
          description={error}
        />
      </div>
    )
  }

  const successCount = controles.filter(c => c.success).length
  const failCount = controles.length - successCount

  const tableData = controles.map((controle) => [
    controle.name,
    getResultBadge(controle.success),
    controle.error || '-',
    controle.errorParams?.join(', ') || '-',
  ])

  return (
    <div className="fr-container fr-py-6w">
      <Link to="/" className="fr-link fr-mb-2w" style={{ display: 'inline-block' }}>
        ← Retour au dashboard
      </Link>

      <h1>Contrôles du dépôt</h1>
      <p className="fr-text--lead">{depotId}</p>
      
      <div className="fr-mb-2w">
        <Badge severity="success" className="fr-mr-1w">{successCount} succès</Badge>
        <Badge severity="error">{failCount} échec{failCount > 1 ? 's' : ''}</Badge>
      </div>

      <Table
        caption="Liste des contrôles"
        noCaption
        bordered
        headers={['Contrôle', 'Résultat', 'Code erreur', 'Paramètres']}
        data={tableData}
      />
    </div>
  )
}
