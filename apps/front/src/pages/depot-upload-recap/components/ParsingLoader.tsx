import { RecapHeader } from './RecapHeader'

type ParsingLoaderProps = {
  steps: string[]
}

export function ParsingLoader({ steps }: ParsingLoaderProps) {
  return (
    <div className="fr-container fr-py-6w">
      <RecapHeader steps={steps} currentStep={2} subtitle="Étape 2 : récapitulatif du dépôt" />

      <div className="fr-card fr-card--no-border fr-p-4w fr-text--center">
        <div className="fr-loader" aria-label="Analyse du fichier" />
        <p className="fr-mt-2w fr-text--bold">Analyse du fichier en cours...</p>
        <p className="fr-mb-0 fr-text--sm fr-text-default--grey">Nous préparons le récapitulatif.</p>
      </div>
    </div>
  )
}


