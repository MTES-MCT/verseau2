import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { RecapCard } from './RecapCard';

type RecapSummaryCardProps = {
  systemName?: string;
  systemCode?: string;
  fileName: string;
  totalAnalyses: number;
};

export function RecapSummaryCard({ systemName, systemCode, fileName, totalAnalyses }: RecapSummaryCardProps) {
  const hasAnalyses = totalAnalyses > 0;

  return (
    <RecapCard className="fr-mb-4w" tone="muted">
      <div className="fr-grid-row fr-grid-row--middle fr-mb-3w">
        <div className="fr-col">
          <h2 className="fr-h5 fr-mb-0">Récapitulatif du dépôt</h2>
        </div>
        <div className="fr-col-auto">
          <Badge severity="success" small>
            Contrôles préliminaires terminés
          </Badge>
        </div>
      </div>

      <p className="fr-mb-4w fr-text-default--grey">
        Voici les informations principales concernant le dépôt que vous venez d&apos;effectuer. Vous pouvez vérifier les
        détails avant de finaliser ou revenir à l&apos;étape précédente.
      </p>

      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-md-4 fr-mb-2w">
          <p className="fr-text--sm fr-text--regular fr-text-default--grey fr-mb-1v">Système d&apos;assainissement</p>
          <p className="fr-text--bold fr-mb-0">{systemName || 'Non renseigné'}</p>
          <p className="fr-text--sm fr-text-default--grey fr-mb-0">{systemCode || 'Code non renseigné'}</p>
        </div>
        <div className="fr-col-12 fr-col-md-4 fr-mb-2w">
          <p className="fr-text--sm fr-text--regular fr-text-default--grey fr-mb-1v">Nom du fichier déposé</p>
          <p className="fr-text--bold fr-mb-1v">{fileName}</p>
          <p className="fr-text--sm fr-text-default--grey fr-mb-0">Format attendu : XML</p>
        </div>
        <div className="fr-col-12 fr-col-md-4 fr-mb-2w">
          <p className="fr-text--sm fr-text--regular fr-text-default--grey fr-mb-1v">Nombre de mesures</p>
          <p className="fr-text--bold fr-mb-1v">{hasAnalyses ? `${totalAnalyses} analyses` : 'N/A'}</p>
          <p className="fr-text--sm fr-text-default--grey fr-mb-0">Estimé sur la période fournie</p>
        </div>
      </div>
    </RecapCard>
  );
}
