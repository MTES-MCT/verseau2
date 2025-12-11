import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';

type EmptyStateProps = {
  onBack: () => void;
};

export function EmptyState({ onBack }: EmptyStateProps) {
  return (
    <div className="fr-container fr-py-6w">
      <Alert
        severity="warning"
        title="Aucun fichier à récapituler"
        description="Revenez à l'étape 1 pour sélectionner un fichier XML."
      />
      <div className="fr-mt-3w">
        <Button priority="secondary" onClick={onBack}>
          Retour à l&apos;étape 1
        </Button>
      </div>
    </div>
  );
}
