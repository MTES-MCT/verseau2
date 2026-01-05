import { useMemo } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { EvenementType } from '@lib/dossier';
import type { ControleView } from '../components/ControleGroup';

function getResultBadge(evenementType: EvenementType | undefined) {
  if (evenementType === EvenementType.ERREUR) {
    return (
      <Badge severity="error" small>
        Échec
      </Badge>
    );
  }
  if (evenementType === EvenementType.AVERTISSEMENT) {
    return (
      <Badge severity="warning" small>
        Avertissement
      </Badge>
    );
  }
  return (
    <Badge severity="success" small>
      Succès
    </Badge>
  );
}

export function useControleTableData(groupedControles: Record<string, ControleView[]>): React.ReactNode[][] {
  return useMemo(() => {
    return Object.entries(groupedControles).map(([name, group]) => {
      if (group.length === 1) {
        const c = group[0];
        return [c.name, getResultBadge(c.evenementType), c.message || '-'];
      }

      const groupErrorCount = group.filter((c) => c.evenementType === EvenementType.ERREUR).length;
      const groupWarningCount = group.filter((c) => c.evenementType === EvenementType.AVERTISSEMENT).length;

      const groupEvenementType =
        groupErrorCount > 0 ? EvenementType.ERREUR : groupWarningCount > 0 ? EvenementType.AVERTISSEMENT : undefined;

      const label = (
        <div className="fr-flex fr-align-items-center">
          <span className="fr-mr-2w">Détails ({group.length})</span>
          {groupErrorCount > 0 && (
            <Badge severity="error" small className="fr-mr-1w">
              {groupErrorCount}
            </Badge>
          )}
          {groupWarningCount > 0 && (
            <Badge severity="warning" small>
              {groupWarningCount}
            </Badge>
          )}
        </div>
      );

      return [
        name,
        getResultBadge(groupEvenementType),
        <Accordion label={label} key={name} className={`${fr.cx('fr-m-0')} accordion-no-border`}>
          <ul className="zebra-list fr-p-0 fr-m-0">
            {group.map((controle, index) => (
              <li key={index} className="fr-flex fr-align-items-start fr-p-1w">
                <span>{controle.message || '-'}</span>
              </li>
            ))}
          </ul>
        </Accordion>,
      ];
    });
  }, [groupedControles]);
}
