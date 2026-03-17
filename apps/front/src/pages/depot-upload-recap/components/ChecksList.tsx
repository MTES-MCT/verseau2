import { fr } from '@codegouvfr/react-dsfr';
import { RecapCard } from './RecapCard';
import type { DroitsDeDepotStatus } from '../useDepotRecap';
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

export function ChecksList({ droitsDeDepotStatus }: ChecksListProps) {
  const droitsDeDepot: { icon: DroitsDeDepotIcon; label: string; colorClassName: DroitsDeDepotColorClassName } =
    (() => {
      switch (droitsDeDepotStatus) {
        case 'loading':
          return {
            icon: 'fr-icon-loader-5-line',
            label: 'Droits de depot - verification en cours',
            colorClassName: undefined,
          } as const;
        case 'authorized':
          return {
            icon: 'fr-icon-checkbox-circle-line',
            label: 'Droits de depot - habilitations du deposant verifiees',
            colorClassName: 'fr-label--success',
          } as const;
        case 'unauthorized':
          return {
            icon: 'fr-icon-close-circle-line',
            label: 'Droits de depot - habilitations du deposant insuffisantes',
            colorClassName: 'fr-label--error',
          } as const;
        case 'flux_qualifie_interdit':
          return {
            icon: 'fr-icon-close-circle-line',
            label:
              "Droits de depot - vous n'avez pas les droits pour deposer un flux qualifie (StatutRsAnalyse/QualRsAnalyse)",
            colorClassName: 'fr-label--error',
          } as const;
        case 'error':
          return {
            icon: 'fr-icon-warning-line',
            label: 'Droits de depot - verification impossible',
            colorClassName: undefined,
          } as const;
      }
    })();

  return (
    <RecapCard className="fr-mb-0">
      <h3 className="fr-h5 fr-mb-1w">Principales verifications effectuees</h3>
      <p className="fr-mb-3w fr-text-default--grey">Les controles suivants ont ete appliques au fichier :</p>
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
