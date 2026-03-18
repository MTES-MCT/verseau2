import { fr } from '@codegouvfr/react-dsfr';
import { RecapCard } from './RecapCard';
import type { DroitsDeDepotStatus } from '../../../hooks/useCheckDroitsDeDepot';
import '../../../../icons/fr-icon-loader-5-line.css';

type DroitsDeDepotIcon =
  | 'fr-icon-loader-5-line'
  | 'fr-icon-checkbox-circle-line'
  | 'fr-icon-close-circle-line'
  | 'fr-icon-warning-line';

type DroitsDeDepotColorClassName = 'fr-label--success' | 'fr-label--error' | undefined;

type ChecksListProps = {
  droitsDeDepotStatus: DroitsDeDepotStatus;
};

function getDroitsDeDepotDisplay(status: DroitsDeDepotStatus): {
  icon: DroitsDeDepotIcon;
  label: string;
  colorClassName: DroitsDeDepotColorClassName;
} {
  switch (status) {
    case 'loading':
      return {
        icon: 'fr-icon-loader-5-line',
        label: 'Droits de dépôt - vérification en cours',
        colorClassName: undefined,
      };
    case 'authorized':
      return {
        icon: 'fr-icon-checkbox-circle-line',
        label: 'Droits de dépôt - habilitations du déposant vérifiées',
        colorClassName: 'fr-label--success',
      };
    case 'unauthorized':
      return {
        icon: 'fr-icon-close-circle-line',
        label: 'Droits de dépôt - habilitations du déposant insuffisantes',
        colorClassName: 'fr-label--error',
      };
    case 'flux_qualifie_interdit':
      return {
        icon: 'fr-icon-close-circle-line',
        label:
          "Droits de dépôt - vous n'avez pas les droits pour déposer un flux qualifié (StatutRsAnalyse/QualRsAnalyse)",
        colorClassName: 'fr-label--error',
      };
    case 'error':
      return {
        icon: 'fr-icon-warning-line',
        label: 'Droits de dépôt - vérification impossible',
        colorClassName: undefined,
      };
  }
}

export function ChecksList({ droitsDeDepotStatus }: ChecksListProps) {
  const droitsDeDepot = getDroitsDeDepotDisplay(droitsDeDepotStatus);

  return (
    <RecapCard className="fr-mb-0">
      <h3 className="fr-h5 fr-mb-1w">Principales vérifications effectuées</h3>
      <p className="fr-mb-3w fr-text-default--grey">Les contrôles suivants ont été appliqués au fichier :</p>
      <div className="fr-mb-3w fr-text-default--grey">
        <p className="fr-mb-1v">
          <span className={fr.cx('fr-icon-checkbox-circle-line', 'fr-label--success', 'fr-mr-1w')} aria-hidden="true" />
          Format du fichier - validation XML
        </p>
        <p className="fr-mb-1v">
          <span
            className={`${fr.cx(droitsDeDepot.colorClassName, 'fr-mr-1w')} ${droitsDeDepot.icon}`}
            aria-hidden="true"
          />
          {droitsDeDepot.label}
        </p>
      </div>
    </RecapCard>
  );
}
