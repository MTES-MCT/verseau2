import { Badge } from '@codegouvfr/react-dsfr/Badge'

type RecapSummaryCardProps = {
  systemName?: string
  systemCode?: string
  fileName: string
  totalAnalyses: number
}

export function RecapSummaryCard({ systemName, systemCode, fileName, totalAnalyses }: RecapSummaryCardProps) {
  const hasAnalyses = totalAnalyses > 0

  return (
    <section className="fr-card fr-card--no-border fr-p-4w fr-mb-4w">
      <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
        <div className="fr-col">
          <h2 className="fr-h5 fr-mb-0">Récapitulatif du dépôt</h2>
        </div>
        <div className="fr-col-auto">
          <Badge severity="success" small>
            Contrôles préliminaires terminés
          </Badge>
        </div>
      </div>

      <p className="fr-mb-4w">
        Voici les informations principales concernant le dépôt que vous venez d&apos;effectuer. Vous pouvez vérifier
        les détails avant de finaliser ou revenir à l&apos;étape précédente.
      </p>

      <div className="fr-grid-row fr-grid-row--gutters fr-mb-2w">
        <div className="fr-col-12 fr-col-md-6 fr-mb-2w">
          <p className="fr-text--sm fr-text--regular fr-text-default--grey fr-mb-0">Système d&apos;assainissement</p>
          <p className="fr-text--bold fr-mb-0">
            {systemName || 'Non renseigné'} {systemCode ? `(${systemCode})` : ''}
          </p>
        </div>
        <div className="fr-col-12 fr-col-md-6 fr-mb-2w">
          <p className="fr-text--sm fr-text--regular fr-text-default--grey fr-mb-0">Nom du fichier déposé</p>
          <p className="fr-text--bold fr-mb-0">{fileName}</p>
        </div>
        <div className="fr-col-12 fr-col-md-6 fr-mb-2w">
          <p className="fr-text--sm fr-text--regular fr-text-default--grey fr-mb-0">Nombre de mesures</p>
          <p className="fr-text--bold fr-mb-0">{hasAnalyses ? `${totalAnalyses} analyses` : 'N/A'}</p>
        </div>
      </div>
    </section>
  )
}


