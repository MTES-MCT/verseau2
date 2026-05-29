import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { EvenementType } from '@lib/dossier';
import { useMemo } from 'react';
import './ControleGroup.css';
import { getIconInfo } from '../helper/controleIconHelper';
import { filterSandreControlesByActiveFilters } from '../helper/controleFilterHelper';
import type { ControleFilterSet, ControleSandreView } from '../types/controle.types';

type ControleGroupSandreProps = {
  title: string;
  controles: ControleSandreView[];
  activeFilters: ControleFilterSet;
};

function getResultBadge(success: boolean) {
  if (success) {
    return (
      <Badge severity="success" small>
        Succès
      </Badge>
    );
  }
  return (
    <Badge severity="error" small>
      Rejeté
    </Badge>
  );
}

export function ControleSandreGroup({ title, controles, activeFilters }: ControleGroupSandreProps) {
  const filteredControles = useMemo(() => {
    return filterSandreControlesByActiveFilters(controles, activeFilters);
  }, [controles, activeFilters]);

  const groupedControles = useMemo(() => {
    return filteredControles.reduce(
      (acc, controle) => {
        const name = controle.name || 'Inconnu';
        if (!acc[name]) {
          acc[name] = [];
        }
        acc[name].push(controle);
        return acc;
      },
      {} as Record<string, ControleSandreView[]>,
    );
  }, [filteredControles]);

  const tableData = useMemo(() => {
    return Object.entries(groupedControles).map(([name, group]) => {
      const displayName = name;

      if (group.length === 1) {
        const c = group[0];
        return [displayName, getResultBadge(c.success), c.message || '-'];
      }

      const groupErrorCount = group.filter((c) => !c.success).length;
      const groupMessage =
        groupErrorCount > 0
          ? `Voir les ${groupErrorCount} erreur${groupErrorCount > 1 ? 's' : ''}`
          : `Détails (${group.length})`;

      const label = (
        <div className="fr-flex fr-align-items-center">
          <span className="fr-mr-2w">{groupMessage}</span>
        </div>
      );

      // Group identical messages to avoid repetitiveness
      const messageCounts = group.reduce(
        (acc, ctrl) => {
          const msg = ctrl.message || '-';
          acc[msg] = (acc[msg] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return [
        displayName,
        getResultBadge(groupErrorCount === 0),
        <Accordion label={label} key={name} className={`${fr.cx('fr-m-0')} accordion-no-border`} defaultExpanded={true}>
          <ul className="zebra-list fr-p-0 fr-m-0">
            {Object.entries(messageCounts).map(([msg, count], index) => {
              const success = group.find((c) => (c.message || '-') === msg)?.success ?? true;
              const { icon, color } = getIconInfo(success, EvenementType.ERREUR);

              return (
                <li key={index} className="fr-flex fr-align-items-start fr-p-1w">
                  <span className={`${icon} fr-mr-1w`} style={{ color }} aria-hidden="true" />
                  <span>
                    {msg} {count > 1 ? <Badge small>{count}</Badge> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </Accordion>,
      ];
    });
  }, [groupedControles]);

  if (filteredControles.length === 0) {
    return null;
  }

  return (
    <div className="controle-group">
      <h2 className={fr.cx('fr-h4', 'fr-mb-2w')}>{title}</h2>

      <div className="controle-table-container">
        <Table headers={['Contrôle', 'Résultat', 'Message']} data={tableData} className={fr.cx('fr-mb-4w')} />
      </div>
    </div>
  );
}

export default ControleSandreGroup;
