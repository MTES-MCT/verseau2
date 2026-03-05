import { useState, type ChangeEvent } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { MOCK_OUVRAGES } from '../data/mockOuvrages';

const modal = createModal({
  id: 'modal-signaler-incoherence',
  isOpenedByDefault: false,
});

export const ReferentielOuvragesPage = () => {
  const [filter, setFilter] = useState('');

  const filteredOuvrages = MOCK_OUVRAGES.filter((o) => o.nom.toLowerCase().includes(filter.toLowerCase()));

  const tableData = filteredOuvrages.map((o) => [
    o.nom,
    o.type,
    o.codePointMesure,
    o.capaciteNominale,
    o.statut,
    <Button priority="secondary" size="small" onClick={() => modal.open()}>
      Signaler
    </Button>,
  ]);

  return (
    <div className={fr.cx('fr-container', 'fr-py-4w')}>
      <h1 className={fr.cx('fr-h1')}>Référentiel des ouvrages</h1>
      <p className={fr.cx('fr-text--lead')}>Consultez les données de référence de vos ouvrages.</p>

      <Input
        label="Rechercher un ouvrage"
        nativeInputProps={{
          placeholder: "Nom de l'ouvrage...",
          onChange: (e: ChangeEvent<HTMLInputElement>) => setFilter(e.target.value),
          value: filter,
        }}
        className={fr.cx('fr-mb-4w')}
      />

      <Table
        data={tableData}
        headers={['Nom', 'Type', 'Code point de mesure', 'Capacité Nominale', 'Statut', 'Action']}
      />

      <modal.Component title="Signaler une incohérence">
        <p>Veuillez décrire l'incohérence constatée pour l'ouvrage sélectionné :</p>
        <textarea className={fr.cx('fr-input')} rows={5} placeholder="Description du problème..." />
        <Button className={fr.cx('fr-mt-2w')} onClick={() => modal.close()}>
          Envoyer le signalement
        </Button>
      </modal.Component>
    </div>
  );
};
