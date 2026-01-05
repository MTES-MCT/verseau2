import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { type ControleDto } from '@lib/dossier';
import { useState, useMemo } from 'react';
import './ControleGroup.css';
import { StatCard } from './StatCard';
import { ToggleSwitch } from '@codegouvfr/react-dsfr/ToggleSwitch';

type ControleGroupSandreProps = {
  title: string;
  controles: ControleSandreView[];
  defaultExpanded?: boolean;
};

export type ControleSandreView = Pick<ControleDto, 'name' | 'success'> & { message: string };

function getResultBadge(success: boolean) {
  if (success) {
    return (
      <Badge severity="success" small>
        Succès
      </Badge>
    );
  }
  return (
    <Badge severity="error" small>
      Échec
    </Badge>
  );
}

export function ControleSandreGroup({ title, controles }: ControleGroupSandreProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  const { successCount, errorCount, filteredControles } = useMemo(() => {
    const success = controles.filter((controle) => controle.success).length;
    const errors = controles.filter((controle) => !controle.success).length;
    const filtered = showSuccess ? controles : controles.filter((controle) => !controle.success);

    return {
      successCount: success,
      errorCount: errors,
      filteredControles: filtered,
    };
  }, [controles, showSuccess]);

  const groupedControles = useMemo(() => {
    return filteredControles.reduce(
      (acc, controle) => {
        const name = controle.name || 'Inconnu';
        if (!acc[name]) {
          acc[name] = [];
        }
        acc[name].push(controle);
        return acc;
      },
      {} as Record<string, ControleSandreView[]>,
    );
  }, [filteredControles]);

  const tableData = useMemo(() => {
    return Object.entries(groupedControles).map(([name, group]) => {
      const displayName = name;

      if (group.length === 1) {
        const c = group[0];
        return [displayName, getResultBadge(c.success), c.message || '-'];
      }

      const groupErrorCount = group.filter((c) => !c.success).length;
      const groupMessage =
        groupErrorCount > 0
          ? `Voir les ${groupErrorCount} erreur${groupErrorCount > 1 ? 's' : ''}`
          : `Détails (${group.length})`;

      const label = (
        <div className="fr-flex fr-align-items-center">
          <span className="fr-mr-2w">{groupMessage}</span>
        </div>
      );

      // Group identical messages to avoid repetitiveness
      const messageCounts = group.reduce(
        (acc, ctrl) => {
          const msg = ctrl.message || '-';
          acc[msg] = (acc[msg] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return [
        displayName,
        getResultBadge(groupErrorCount === 0),
        <Accordion label={label} key={name} className={`${fr.cx('fr-m-0')} accordion-no-border`}>
          <ul className="zebra-list fr-p-0 fr-m-0">
            {Object.entries(messageCounts).map(([msg, count], index) => (
              <li key={index} className="fr-flex fr-align-items-start fr-p-1w">
                <div className="fr-mr-2w" style={{ flexShrink: 0 }}>
                  {getResultBadge(group.find((c) => (c.message || '-') === msg)?.success ?? true)}
                </div>
                <span>
                  {msg} {count > 1 ? <Badge small>{count}</Badge> : null}
                </span>
              </li>
            ))}
          </ul>
        </Accordion>,
      ];
    });
  }, [groupedControles]);

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
          fixed
        />
      </div>
    </div>
  );
}

export default ControleSandreGroup;
