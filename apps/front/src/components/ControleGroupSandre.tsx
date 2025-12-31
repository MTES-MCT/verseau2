import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { type ControleDto } from '@lib/dossier';
import { useState } from 'react';
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
    <Badge severity="success" small>
      Avertissement
    </Badge>
  );
}

export function ControleSandreGroup({ title, controles }: ControleGroupSandreProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  console.log(controles);

  if (controles.length === 0) {
    return null;
  }

  const successCount = controles.filter((controle) => controle.success).length;
  const errorCount = controles.filter((controle) => !controle.success).length;

  const filteredControles = showSuccess ? controles : controles.filter((controle) => !controle.success);

  return (
    <div className="controle-group">
      <div className="fr-flex fr-justify-content-between fr-align-items-center fr-width-full fr-mb-2w">
        <span>{title}</span>
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
      <Table
        caption={`Liste des contrôles ${title}`}
        noCaption
        bordered
        headers={['Contrôle', 'Résultat', 'Message']}
        data={filteredControles.map((controle) => [
          controle.name,
          getResultBadge(controle.success),
          controle.message || '-',
        ])}
        className={`${fr.cx('fr-p-0', 'fr-m-0')} table-no-margin-and-padding`}
      />
    </div>
  );
}

export default ControleSandreGroup;
