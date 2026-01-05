import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { EvenementType } from '@lib/dossier';
import type { TableDataRow } from '../hooks/useControleTableData';

type ControleMessageCellProps = {
  row: TableDataRow;
  showSuccess: boolean;
};

export function ControleMessageCell({ row, showSuccess }: ControleMessageCellProps) {
  if (!row.isGroup) {
    return <>{row.message}</>;
  }

  const { controls } = row.groupData;

  const label = (
    <div className="fr-flex fr-align-items-center">
      <span className="fr-mr-2w">{row.message}</span>
    </div>
  );

  // Group by message and outcome to avoid repetitiveness and show the correct icon
  const messageGroups = controls.reduce(
    (acc, ctrl) => {
      if (!showSuccess && ctrl.success) {
        return acc;
      }
      const msg = ctrl.message || '-';
      const status = ctrl.success ? 'success' : ctrl.evenementType || 'error';
      const key = `${status}-${msg}`;
      if (!acc[key]) {
        acc[key] = {
          message: msg,
          count: 0,
          success: ctrl.success,
          evenementType: ctrl.evenementType,
        };
      }
      acc[key].count++;
      return acc;
    },
    {} as Record<
      string,
      { message: string; count: number; success: boolean; evenementType: EvenementType | undefined }
    >,
  );

  const getIconInfo = (success: boolean, evenementType: EvenementType | undefined) => {
    if (success) {
      return { icon: 'fr-icon-checkbox-circle-fill', color: 'var(--text-default-success)' };
    }
    if (evenementType === EvenementType.AVERTISSEMENT) {
      return { icon: 'fr-icon-warning-fill', color: 'var(--text-default-warning)' };
    }
    return { icon: 'fr-icon-error-fill', color: 'var(--text-default-error)' };
  };

  return (
    <Accordion label={label} key={row.name} className={`${fr.cx('fr-m-0')} accordion-no-border`}>
      <ul className="zebra-list fr-p-0 fr-m-0">
        {Object.values(messageGroups).map((item, index) => {
          const { icon, color } = getIconInfo(item.success, item.evenementType);
          return (
            <li key={`${index}`} className="fr-flex fr-align-items-start fr-p-1w">
              <span className={`${icon} fr-mr-1w`} style={{ color }} aria-hidden="true" />
              <span>
                {item.message} {item.count > 1 ? <Badge small>{item.count}</Badge> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </Accordion>
  );
}
