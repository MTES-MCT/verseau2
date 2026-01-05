import { fr } from '@codegouvfr/react-dsfr';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { useState, useMemo } from 'react';
import './ControleGroup.css';
import { useControleStatistics } from '../hooks/useControleStatistics';
import { useGroupedControles } from '../hooks/useGroupedControles';
import { useControleTableData } from '../hooks/useControleTableData';
import { ControleResultBadges } from './ControleResultBadges';
import { ControleMessageCell } from './ControleMessageCell';
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

  const { successCount, errorCount, warningCount } = useControleStatistics(controles, showSuccess);
  const groupedControles = useGroupedControles(controles);
  const tableDataRows = useControleTableData(groupedControles, showSuccess).sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  const tableData = useMemo(() => {
    return tableDataRows.map((row) => {
      const description = ControleDescription[row.name as keyof typeof ControleDescription];
      const displayName = description ? `${row.name} - ${description}` : row.name;

      return [
        displayName,
        <ControleResultBadges row={row} />,
        <ControleMessageCell row={row} showSuccess={showSuccess} />,
      ];
    });
  }, [tableDataRows, showSuccess]);

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
