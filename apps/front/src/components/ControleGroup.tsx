import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { useState } from 'react';
import './ControleGroup.css';
import { useControleStatistics } from '../hooks/useControleStatistics';
import { useGroupedControles } from '../hooks/useGroupedControles';
import { useControleTableData } from '../hooks/useControleTableData';
import { ResultBadge } from './ResultBadge';
import type { ControleView } from '../types/controle.types';
import { ControleDescription } from '@lib/dossier';
import { StatCard } from './StatCard';
import { ToggleSwitch } from '@codegouvfr/react-dsfr/ToggleSwitch';

type ControleGroupProps = {
  title: string;
  controles: ControleView[];
};

export function ControleGroup({ title, controles }: ControleGroupProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  const { successCount, errorCount, warningCount, filteredControles } = useControleStatistics(controles, showSuccess);
  const groupedControles = useGroupedControles(filteredControles);
  const tableDataRows = useControleTableData(groupedControles);

  const tableData = tableDataRows.map((row) => {
    const description = ControleDescription[row.name as keyof typeof ControleDescription];
    const displayName = description ? `${row.name} - ${description}` : row.name;

    if (!row.isGroup) {
      return [displayName, <ResultBadge evenementType={row.evenementType} small />, row.message];
    }

    const groupData = row.groupData;
    const label = (
      <div className="fr-flex fr-align-items-center">
        <span className="fr-mr-2w">{row.message}</span>
      </div>
    );

    // Group identical messages to avoid repetitiveness
    const messageCounts = groupData.controls.reduce(
      (acc, ctrl) => {
        const msg = ctrl.message || '-';
        acc[msg] = (acc[msg] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return [
      displayName,
      <ResultBadge evenementType={row.evenementType} small />,
      <Accordion label={label} key={row.name} className={`${fr.cx('fr-m-0')} accordion-no-border`}>
        <ul className="zebra-list fr-p-0 fr-m-0">
          {Object.entries(messageCounts).map(([msg, count], index) => (
            <li key={`${index}`} className="fr-flex fr-align-items-start fr-p-1w">
              <span>
                {msg} {count > 1 ? <Badge small>{count}</Badge> : null}
              </span>
            </li>
          ))}
        </ul>
      </Accordion>,
    ];
  });

  if (controles.length === 0) {
    return null;
  }

  return (
    <div className="controle-group">
      <h2 className={fr.cx('fr-h4', 'fr-mb-2w')}>{title}</h2>

      <div className="fr-grid-row fr-grid-row--gutters fr-mb-2w">
        <StatCard
          count={successCount}
          label="Succès"
          icon="fr-icon-checkbox-circle-fill"
          color="var(--text-default-success)"
        />
        <StatCard
          count={warningCount}
          label="Avertissement"
          icon="fr-icon-warning-fill"
          color="var(--text-default-warning)"
        />
        <StatCard count={errorCount} label="Erreur" icon="fr-icon-error-fill" color="var(--text-default-error)" />
      </div>

      <div className="controle-table-container">
        <Table
          caption={
            <div className="fr-flex fr-justify-content-end">
              <ToggleSwitch
                label="Afficher tous les contrôles (incluant les succès)"
                labelPosition="left"
                checked={showSuccess}
                onChange={setShowSuccess}
              />
            </div>
          }
          headers={['Contrôle', 'Résultat', 'Message']}
          data={tableData}
          className={fr.cx('fr-mb-4w')}
        />
      </div>
    </div>
  );
}

export default ControleGroup;
