import { fr } from '@codegouvfr/react-dsfr';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { useState, useMemo } from 'react';
import './ControleGroup.css';
import { useControleStatistics } from '../hooks/useControleStatistics';
import { useGroupedControles } from '../hooks/useGroupedControles';
import { useControleTableData } from '../hooks/useControleTableData';
import { ControleResultBadges } from './ControleResultBadges';
import { ControleMessageCell } from './ControleMessageCell';
import type { ControleView, ControleFilterType, ControleFilterSet } from '../types/controle.types';
import { ControleDescription } from '@lib/dossier';
import { ClickableStatCard } from './ClickableStatCard';

type ControleGroupProps = {
  title: string;
  controles: ControleView[];
};

export function ControleGroup({ title, controles }: ControleGroupProps) {
  const [activeFilters, setActiveFilters] = useState<ControleFilterSet>(new Set(['warning', 'error']));

  const toggleFilter = (filter: ControleFilterType) => {
    setActiveFilters((prev) => {
      const newFilters = new Set(prev);
      if (newFilters.has(filter)) {
        newFilters.delete(filter);
      } else {
        newFilters.add(filter);
      }
      return newFilters;
    });
  };

  const { successCount, errorCount, warningCount } = useControleStatistics(controles);
  const groupedControles = useGroupedControles(controles);
  const tableDataRows = useControleTableData(groupedControles, activeFilters).sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  const tableData = useMemo(() => {
    return tableDataRows.map((row) => {
      const description = ControleDescription[row.name as keyof typeof ControleDescription];
      const displayName = description ? `${row.name} - ${description}` : row.name;

      return [
        displayName,
        <ControleResultBadges row={row} />,
        <ControleMessageCell row={row} activeFilters={activeFilters} />,
      ];
    });
  }, [tableDataRows, activeFilters]);

  if (controles.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className={fr.cx('fr-h4', 'fr-mb-2w')}>{title}</h2>

      <div className="fr-grid-row fr-grid-row--gutters fr-mb-2w">
        <ClickableStatCard
          count={successCount}
          label="Succès"
          icon="fr-icon-checkbox-circle-fill"
          color="var(--text-default-success)"
          onClick={() => toggleFilter('success')}
          isActive={activeFilters.has('success')}
        />
        <ClickableStatCard
          count={warningCount}
          label="Avertissement"
          icon="fr-icon-warning-fill"
          color="var(--text-default-warning)"
          onClick={() => toggleFilter('warning')}
          isActive={activeFilters.has('warning')}
        />
        <ClickableStatCard
          count={errorCount}
          label="Erreur"
          icon="fr-icon-error-fill"
          color="var(--text-default-error)"
          onClick={() => toggleFilter('error')}
          isActive={activeFilters.has('error')}
        />
      </div>

      <div className="controle-table-container">
        <Table headers={['Contrôle', 'Résultat', 'Message']} data={tableData} className={fr.cx('fr-mb-4w')} />
      </div>
    </div>
  );
}

export default ControleGroup;
