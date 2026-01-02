import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { type ControleDto } from '@lib/dossier';
import { useState, useMemo } from 'react';
import './ControleGroup.css';

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
      if (group.length === 1) {
        const c = group[0];
        return [c.name, getResultBadge(c.success), c.message || '-'];
      }

      const groupErrorCount = group.filter((c) => !c.success).length;

      const label = (
        <div className="fr-flex fr-align-items-center">
          <span className="fr-mr-2w">Détails ({group.length})</span>
          {groupErrorCount > 0 && (
            <Badge severity="error" small>
              {groupErrorCount}
            </Badge>
          )}
        </div>
      );

      return [
        name,
        getResultBadge(groupErrorCount === 0),
        <Accordion label={label} key={name} className={`${fr.cx('fr-m-0')} accordion-no-border`}>
          <ul className="zebra-list fr-p-0 fr-m-0">
            {group.map((controle, index) => (
              <li key={index} className="fr-flex fr-align-items-start fr-p-1w">
                <div className="fr-mr-2w" style={{ flexShrink: 0 }}>
                  {getResultBadge(controle.success)}
                </div>
                <span>{controle.message || '-'}</span>
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
      <div className="fr-flex fr-justify-content-between fr-align-items-center fr-width-full fr-mb-2w">
        <span className={fr.cx('fr-text--bold')}>{title}</span>
        <div>
          <Badge severity="success" className="fr-mr-1w">
            {successCount} succès
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

export default ControleSandreGroup;
