import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { useState } from 'react';
import './ControleGroup.css';
import { useControleStatistics } from '../hooks/useControleStatistics';
import { useGroupedControles } from '../hooks/useGroupedControles';
import { useControleTableData } from '../hooks/useControleTableData';
import { ResultBadge } from './ResultBadge';
import type { ControleView } from '../types/controle.types';

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
    if (!row.isGroup) {
      return [row.name, <ResultBadge evenementType={row.evenementType} small />, row.message];
    }

    const groupData = row.groupData;
    const label = (
      <div className="fr-flex fr-align-items-center">
        <span className="fr-mr-2w">{row.message}</span>
        {groupData.errorCount > 0 && (
          <Badge severity="error" small className="fr-mr-1w">
            {groupData.errorCount}
          </Badge>
        )}
        {groupData.warningCount > 0 && (
          <Badge severity="warning" small>
            {groupData.warningCount}
          </Badge>
        )}
      </div>
    );

    return [
      row.name,
      <ResultBadge evenementType={row.evenementType} small />,
      <Accordion label={label} key={row.name} className={`${fr.cx('fr-m-0')} accordion-no-border`}>
        <ul className="zebra-list fr-p-0 fr-m-0">
          {groupData.controls.map((controle, index) => (
            <li key={`${controle.name}-${index}`} className="fr-flex fr-align-items-start fr-p-1w">
              <span>{controle.message || '-'}</span>
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
      <div className="fr-flex fr-justify-content-between fr-align-items-center fr-width-full fr-mb-2w">
        <span className={fr.cx('fr-text--bold')}>{title}</span>
        <div>
          <Badge severity="success" className="fr-mr-1w">
            {successCount} succès
          </Badge>
          <Badge severity="warning" className="fr-mr-1w">
            {warningCount} avertissement{warningCount > 1 ? 's' : ''}
          </Badge>
          <Badge severity="error" className="fr-mr-1w">
            {errorCount} erreur{errorCount > 1 ? 's' : ''}
          </Badge>
        </div>
      </div>
      <Button priority="secondary" onClick={() => setShowSuccess(!showSuccess)} className="fr-mb-2w">
        {showSuccess ? 'Masquer les succès' : 'Tout afficher'}
      </Button>

      <Table noCaption headers={['Contrôle', 'Résultat', 'Message']} data={tableData} className={fr.cx('fr-mb-4w')} />
    </div>
  );
}

export default ControleGroup;
