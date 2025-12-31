import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { type ControleDto, EvenementType } from '@lib/dossier';
import { useState } from 'react';
import './ControleGroup.css';

type ControleGroupProps = {
  title: string;
  controles: ControleView[];
  defaultExpanded?: boolean;
};

export type ControleView = Pick<ControleDto, 'name' | 'success' | 'evenementType'> & { message: string };

function getResultBadge(evenementType: EvenementType | undefined) {
  if (evenementType === EvenementType.ERREUR) {
    return (
      <Badge severity="error" small>
        Échec
      </Badge>
    );
  }
  if (evenementType === EvenementType.AVERTISSEMENT) {
    return (
      <Badge severity="warning" small>
        Avertissement
      </Badge>
    );
  }
  return (
    <Badge severity="success" small>
      Succès
    </Badge>
  );
}

export function ControleGroup({ title, controles }: ControleGroupProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  console.log(controles);

  if (controles.length === 0) {
    return null;
  }

  const successCount = controles.filter((controle) => controle.success).length;
  const errorCount = controles.filter(
    (controle) => !controle.success && controle.evenementType === EvenementType.ERREUR,
  ).length;
  const warningCount = controles.filter(
    (controle) => !controle.success && controle.evenementType === EvenementType.AVERTISSEMENT,
  ).length;

  const filteredControles = showSuccess ? controles : controles.filter((controle) => !controle.success);

  return (
    <div className="controle-group">
      <div className="fr-flex fr-justify-content-between fr-align-items-center fr-width-full fr-mb-2w">
        <span>{title}</span>
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
      <Table
        caption={`Liste des contrôles ${title}`}
        noCaption
        bordered
        headers={['Contrôle', 'Résultat', 'Message']}
        data={filteredControles.map((controle) => [
          controle.name,
          getResultBadge(controle.evenementType),
          controle.message || '-',
        ])}
        className={`${fr.cx('fr-p-0', 'fr-m-0')} table-no-margin-and-padding`}
      />
    </div>
  );
}

export default ControleGroup;
