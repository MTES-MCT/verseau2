import { fr } from '@codegouvfr/react-dsfr';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Table } from '@codegouvfr/react-dsfr/Table';
import type { ControleDto } from '@lib/dossier';
import './ControleGroup.css';

type ControleGroupProps = {
  title: string;
  controles: ControleView[];
  defaultExpanded?: boolean;
};

export type ControleView = Pick<ControleDto, 'name' | 'success'> & { message: string };

function getResultBadge(success: boolean) {
  return success ? (
    <Badge severity="success" small>
      Succès
    </Badge>
  ) : (
    <Badge severity="error" small>
      Échec
    </Badge>
  );
}

export function ControleGroup({ title, controles, defaultExpanded = false }: ControleGroupProps) {
  if (controles.length === 0) {
    return null;
  }

  const successCount = controles.filter((controle) => controle.success).length;
  const failCount = controles.length - successCount;

  return (
    <Accordion
      label={
        <div className="fr-flex fr-justify-content-between fr-align-items-center fr-width-full">
          <span>{title}</span>
          <div>
            <Badge severity="success" className="fr-mr-1w">
              {successCount} succès
            </Badge>
            <Badge severity="error">
              {failCount} échec{failCount > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      }
      defaultExpanded={defaultExpanded}
      classes={{
        collapse: fr.cx('fr-p-0', 'fr-m-0'),
      }}
    >
      <Table
        caption={`Liste des contrôles ${title}`}
        noCaption
        bordered
        headers={['Contrôle', 'Résultat', 'Message']}
        data={controles.map((controle) => [controle.name, getResultBadge(controle.success), controle.message || '-'])}
        className={`${fr.cx('fr-p-0', 'fr-m-0')} table-no-margin-and-padding`}
      />
    </Accordion>
  );
}

export default ControleGroup;
