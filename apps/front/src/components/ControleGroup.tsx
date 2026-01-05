import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { useState } from 'react';
import './ControleGroup.css';
import { useControleStatistics } from '../hooks/useControleStatistics';
import { useGroupedControles } from '../hooks/useGroupedControles';
import { useControleTableData } from '../hooks/useControleTableData';
import { ControleResultBadges } from './ControleResultBadges';
import type { ControleView } from '../types/controle.types';
import { ControleDescription, EvenementType } from '@lib/dossier';
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
  const tableDataRows = useControleTableData(groupedControles, showSuccess);

  const tableData = tableDataRows.map((row) => {
    const description = ControleDescription[row.name as keyof typeof ControleDescription];
    const displayName = description ? `${row.name} - ${description}` : row.name;

    const resultCell = <ControleResultBadges row={row} />;

    if (!row.isGroup) {
      return [displayName, resultCell, row.message];
    }

    const groupData = row.groupData;
    const label = (
      <div className="fr-flex fr-align-items-center">
        <span className="fr-mr-2w">{row.message}</span>
      </div>
    );

    // Group by message and outcome to avoid repetitiveness and show the correct icon
    const messageGroups = groupData.controls.reduce(
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

    return [
      displayName,
      resultCell,
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
