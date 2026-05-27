import { fr } from '@codegouvfr/react-dsfr';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { useMemo } from 'react';
import './ControleGroup.css';
import { useGroupedControles } from '../hooks/useGroupedControles';
import { useControleTableData } from '../hooks/useControleTableData';
import { ControleResultBadges } from './ControleResultBadges';
import { ControleMessageCell } from './ControleMessageCell';
import type { ControleView, ControleFilterSet } from '../types/controle.types';
import { ControleDescription } from '@lib/dossier';

type ControleGroupProps = {
  title: string;
  controles: ControleView[];
  activeFilters: ControleFilterSet;
};

export function ControleGroup({ title, controles, activeFilters }: ControleGroupProps) {
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

  if (controles.length === 0 || tableData.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className={fr.cx('fr-h4', 'fr-mb-2w')}>{title}</h2>

      <div className="controle-table-container">
        <Table headers={['Contrôle', 'Résultat', 'Message']} data={tableData} className={fr.cx('fr-mb-4w')} />
      </div>
    </div>
  );
}

export default ControleGroup;
