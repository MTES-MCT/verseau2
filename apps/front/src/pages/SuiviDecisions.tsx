import { useState, useMemo } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { MOCK_DECISIONS } from '../data/mockDecisions';

export const SuiviDecisionsPage = () => {
  const [nature, setNature] = useState('');
  const [ouvrage, setOuvrage] = useState('');

  const ouvrages = useMemo(() => Array.from(new Set(MOCK_DECISIONS.map((d) => d.ouvrage))), []);

  const filteredDecisions = useMemo(() => {
    return MOCK_DECISIONS.filter((d) => {
      return (
        (nature === '' || d.nature === nature) &&
        (ouvrage === '' || d.ouvrage.toLowerCase().includes(ouvrage.toLowerCase()))
      );
    });
  }, [nature, ouvrage]);

  const tableData = filteredDecisions.map((d) => [d.date, <Badge>{d.nature}</Badge>, d.ouvrage, d.description]);

  return (
    <div className={fr.cx('fr-container', 'fr-py-4w')}>
      <h1 className={fr.cx('fr-h1')}>Historique des décisions SPE</h1>
      <p className={fr.cx('fr-text--lead')}>
        Consultez les décisions prises par le Service de Police de l'Eau impactant vos ouvrages.
      </p>

      <Alert
        small
        description="Les données présentées ici sont basées sur le référentiel J-7 et ne reflètent pas les événements en temps réel. Cette vue est fournie à titre indicatif."
        severity="warning"
        className={fr.cx('fr-mb-4w')}
      />

      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-mb-4w')}>
        <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
          <Select
            label="Nature de la décision"
            nativeSelectProps={{ onChange: (e) => setNature(e.target.value), value: nature }}
          >
            <option value="">Toutes les décisions</option>
            <option value="Bilan écarté">Bilan écarté</option>
            <option value="Événement exceptionnel">Événement exceptionnel</option>
            <option value="Tolérance">Tolérance</option>
          </Select>
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
          <Input
            label="Ouvrage (recherche)"
            nativeInputProps={{
              onChange: (e) => setOuvrage(e.target.value),
              value: ouvrage,
              list: 'ouvrages-decisions-list',
            }}
          />
          <datalist id="ouvrages-decisions-list">
            {ouvrages.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>
      </div>

      <Table data={tableData} headers={['Date', 'Nature', 'Ouvrage', 'Description']} />
    </div>
  );
};
