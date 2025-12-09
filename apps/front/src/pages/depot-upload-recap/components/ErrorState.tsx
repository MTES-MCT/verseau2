import { Alert } from '@codegouvfr/react-dsfr/Alert'
import { Button } from '@codegouvfr/react-dsfr/Button'

type ErrorStateProps = {
  message: string
  onBack: () => void
}

export function ErrorState({ message, onBack }: ErrorStateProps) {
  return (
    <div className="fr-container fr-py-6w">
      <Alert severity="error" title="Erreur lors du parsing" description={message} />
      <div className="fr-mt-3w">
        <Button priority="secondary" onClick={onBack}>
          Retour à l&apos;étape 1
        </Button>
      </div>
    </div>
  )
}


