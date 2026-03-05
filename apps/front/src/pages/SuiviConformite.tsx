import { useState, useMemo } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { MOCK_CONFORMITE, type Conformite } from '../data/mockConformite';

const modal = createModal({
  id: 'modal-details-conformite',
  isOpenedByDefault: false,
});

export const SuiviConformitePage = () => {
  const [selectedConformite, setSelectedConformite] = useState<Conformite | null>(null);
  const [systeme, setSysteme] = useState('');
  const [statut, setStatut] = useState('');

  const systemes = useMemo(() => Array.from(new Set(MOCK_CONFORMITE.map((c) => c.systeme))), []);

  const filtered = useMemo(() => {
    return MOCK_CONFORMITE.filter((c) => {
      return (
        (systeme === '' || c.systeme.toLowerCase().includes(systeme.toLowerCase())) &&
        (statut === '' || c.statut === statut)
      );
    });
  }, [systeme, statut]);

  const openModal = (c: Conformite) => {
    setSelectedConformite(c);
    modal.open();
  };

  const getBadgeSeverity = (s: string) => {
    switch (s) {
      case 'Conforme':
        return 'success';
      case 'Non conforme':
        return 'error';
      case 'En évaluation':
        return 'info';
      default:
        return undefined;
    }
  };

  const tableData = filtered.map((c) => [
    c.periode,
    c.systeme,
    <Badge severity={getBadgeSeverity(c.statut)}>{c.statut}</Badge>,
    c.details.length > 0 ? (
      <Button priority="tertiary" size="small" onClick={() => openModal(c)}>
        Détails
      </Button>
    ) : (
      '-'
    ),
  ]);

  return (
    <div className={fr.cx('fr-container', 'fr-py-4w')}>
      <h1 className={fr.cx('fr-h1')}>Conformité prévisionnelle</h1>
      <p className={fr.cx('fr-text--lead')}>Visualisez le statut de conformité et le détail des calculs par système.</p>

      <Alert
        small
        description="Données issues de Roseau (base J-7). Cette vue est fournie à titre indicatif."
        severity="info"
        className={fr.cx('fr-mb-4w')}
      />

      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-mb-4w')}>
        <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
          <Input
            label="Système (recherche)"
            nativeInputProps={{
              onChange: (e) => setSysteme(e.target.value),
              value: systeme,
              list: 'systemes-list',
            }}
          />
          <datalist id="systemes-list">
            {systemes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
          <Select label="Statut" nativeSelectProps={{ onChange: (e) => setStatut(e.target.value), value: statut }}>
            <option value="">Tous les statuts</option>
            <option value="Conforme">Conforme</option>
            <option value="Non conforme">Non conforme</option>
            <option value="En évaluation">En évaluation</option>
          </Select>
        </div>
      </div>

      <Table data={tableData} headers={['Période', 'Système', 'Statut', 'Détail']} />

      <modal.Component
        title={`Détails de conformité : ${selectedConformite?.systeme} (${selectedConformite?.periode})`}
      >
        {selectedConformite && (
          <Table
            data={selectedConformite.details.map((d) => [
              d.parametre,
              d.valeur.toString(),
              d.seuil.toString(),
              d.statut,
            ])}
            headers={['Paramètre', 'Valeur', 'Seuil', 'Statut']}
          />
        )}
      </modal.Component>
    </div>
  );
};
