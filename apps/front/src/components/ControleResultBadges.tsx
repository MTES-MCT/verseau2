import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { ResultBadge } from './ResultBadge';
import type { TableDataRow } from '../hooks/useControleTableData';

type ControleResultBadgesProps = {
  row: TableDataRow;
};

export function ControleResultBadges({ row }: ControleResultBadgesProps) {
  if (!row.isGroup) {
    return <ResultBadge evenementType={row.evenementType} small />;
  }

  const { errorCount, warningCount, successCount } = row.groupData;

  return (
    <div className="fr-flex fr-grid-row--gutters">
      {errorCount > 0 && (
        <Badge severity="error" small className="fr-mr-1v">
          {errorCount}
        </Badge>
      )}
      {warningCount > 0 && (
        <Badge severity="warning" small className="fr-mr-1v">
          {warningCount}
        </Badge>
      )}
      {successCount > 0 && (
        <Badge severity="success" small>
          {successCount}
        </Badge>
      )}
    </div>
  );
}
