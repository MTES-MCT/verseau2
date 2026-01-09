import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';

export function DepotDownloadPage() {
  return (
    <div className={fr.cx('fr-container', 'fr-py-8w')}>
      <h1>Télécharger des données d’autosurveillance</h1>
      <Alert
        title="Page en cours de développement"
        description="Cette fonctionnalité n'est pas encore disponible. Elle sera prochainement mise en service."
        severity="info"
      />
    </div>
  );
}
