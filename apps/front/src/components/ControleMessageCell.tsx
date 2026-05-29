import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { EvenementType } from '@lib/dossier';
import { useState, memo } from 'react';
import type { TableDataRow } from '../hooks/useControleTableData';
import type { ControleFilterSet } from '../types/controle.types';
import { getIconInfo } from '../helper/controleIconHelper';
import { matchesControleFilters } from '../helper/controleFilterHelper';

type ControleMessageCellProps = {
  row: TableDataRow;
  activeFilters: ControleFilterSet;
};
const ADD_MORE_COUNT = 100;
export const ControleMessageCell = memo(function ControleMessageCell({ row, activeFilters }: ControleMessageCellProps) {
  const [visibleCount, setVisibleCount] = useState(5);

  if (!row.isGroup) {
    return <>{row.message}</>;
  }

  const { controls } = row.groupData;

  const label = (
    <div className="fr-flex fr-align-items-center">
      <span className="fr-mr-2w">{row.message}</span>
    </div>
  );

  const messageGroups = controls.reduce(
    (acc, ctrl) => {
      if (!matchesControleFilters(ctrl, activeFilters)) {
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

  const allItems = Object.values(messageGroups);
  const visibleItems = allItems.slice(0, visibleCount);

  return (
    <Accordion label={label} key={row.name} className={`${fr.cx('fr-m-0')} accordion-no-border`}>
      <ul className="zebra-list fr-p-0 fr-m-0">
        {visibleItems.map((item, index) => {
          const { icon, color } = getIconInfo(item.success, item.evenementType);
          return (
            <li key={`${index}`} className="fr-flex fr-align-items-start fr-p-1w">
              <span className={`${icon} fr-mr-1w`} style={{ color }} aria-hidden="true" />
              <span>
                {item.message} {item.count > 1 ? <Badge small>Remonté {item.count} fois</Badge> : null}
              </span>
            </li>
          );
        })}
      </ul>
      {allItems.length > visibleCount && (
        <div className="fr-mt-2w fr-flex fr-justify-center">
          <Button
            priority="tertiary no outline"
            size="small"
            onClick={() => setVisibleCount((prev) => prev + ADD_MORE_COUNT)}
          >
            Afficher {allItems.length - visibleCount > ADD_MORE_COUNT ? ADD_MORE_COUNT : allItems.length - visibleCount}{' '}
            suivants ({allItems.length - visibleCount} restants)
          </Button>
        </div>
      )}
    </Accordion>
  );
});
