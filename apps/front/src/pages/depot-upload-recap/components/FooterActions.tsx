import { Button } from '@codegouvfr/react-dsfr/Button'

type FooterActionsProps = {
  onBack: () => void
  onFinalize: () => void
  finalizeDisabled?: boolean
}

export function FooterActions({ onBack, onFinalize, finalizeDisabled }: FooterActionsProps) {
  return (
    <section className="fr-card fr-card--no-border fr-p-4w">
      <div className="fr-grid-row fr-grid-row--space-between fr-grid-row--middle">
        <div className="fr-col-auto">
          <Button priority="secondary" iconId="ri-arrow-left-line" onClick={onBack}>
            Retour à l&apos;étape précédente
          </Button>
        </div>
        <div className="fr-col-auto">
          <Button
            iconId="ri-arrow-right-line"
            iconPosition="right"
            onClick={onFinalize}
            disabled={finalizeDisabled}
          >
            Étape 3 finaliser le dépôt
          </Button>
        </div>
      </div>
    </section>
  )
}


