import { Badge } from '@codegouvfr/react-dsfr/Badge';
import type { TableDataRow } from '../hooks/useControleTableData';
import { EvenementType } from '@lib/dossier';

type ControleResultBadgesProps = {
  row: TableDataRow;
};

export function ControleResultBadges({ row }: ControleResultBadgesProps) {
  if (!row.isGroup) {
    const evenementType = row.evenementType;
    return (
      <div className="fr-flex fr-grid-row--gutters">
        {evenementType === EvenementType.ERREUR && (
          <Badge severity="error" small>
            Échec
          </Badge>
        )}
        {evenementType === EvenementType.AVERTISSEMENT && (
          <Badge severity="warning" small>
            Avertissement
          </Badge>
        )}
        {evenementType === EvenementType.INFORMATION && (
          <Badge severity="info" small>
            Information
          </Badge>
        )}
        {!evenementType && (
          <Badge severity="success" small>
            Succès
          </Badge>
        )}
      </div>
    );
  }

  const { errorCount, warningCount, informationCount, successCount } = row.groupData;

  return (
    <div className="fr-flex fr-grid-row--gutters">
      {errorCount > 0 && (
        <Badge severity="error" small>
          {errorCount}
        </Badge>
      )}
      {warningCount > 0 && (
        <Badge severity="warning" small>
          {warningCount}
        </Badge>
      )}
      {informationCount > 0 && (
        <Badge severity="info" small>
          {informationCount}
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
