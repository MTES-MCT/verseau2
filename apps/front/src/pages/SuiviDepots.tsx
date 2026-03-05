import { useState, useMemo } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { MOCK_SUIVI_DEPOTS } from '../data/mockSuiviDepots';
import { AppRoutes } from '../routes';

export const SuiviDepotsPage = () => {
  const [ouvrage, setOuvrage] = useState('');
  const [statut, setStatut] = useState('');

  const ouvrages = useMemo(() => Array.from(new Set(MOCK_SUIVI_DEPOTS.map((d) => d.ouvrage))), []);

  const filteredDepots = useMemo(() => {
    return MOCK_SUIVI_DEPOTS.filter((d) => {
      return (
        (ouvrage === '' || d.ouvrage.toLowerCase().includes(ouvrage.toLowerCase())) &&
        (statut === '' || d.statut === statut)
      );
    });
  }, [ouvrage, statut]);

  const getBadgeSeverity = (s: string) => {
    switch (s) {
      case 'Transmis':
        return 'success';
      case 'En attente':
        return 'info';
      case 'En retard':
        return 'error';
      case 'Rejeté':
        return 'warning';
      default:
        return undefined;
    }
  };

  const tableData = filteredDepots.map((d) => [
    d.periode,
    d.ouvrage,
    <Badge severity={getBadgeSeverity(d.statut)}>{d.statut}</Badge>,
    d.statut !== 'Transmis' ? (
      <Button size="small" linkProps={{ href: AppRoutes.DEPOT_UPLOAD }}>
        Déposer
      </Button>
    ) : (
      '-'
    ),
  ]);

  return (
    <div className={fr.cx('fr-container', 'fr-py-4w')}>
      <h1 className={fr.cx('fr-h1')}>Suivi des dépôts attendus</h1>
      <p className={fr.cx('fr-text--lead')}>
        Vérifiez l'état de complétude de vos transmissions par ouvrage et période.
      </p>

      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-mb-4w')}>
        <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
          <Input
            label="Ouvrage (recherche)"
            nativeInputProps={{
              onChange: (e) => setOuvrage(e.target.value),
              value: ouvrage,
              list: 'ouvrages-depots-list',
            }}
          />
          <datalist id="ouvrages-depots-list">
            {ouvrages.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
          <Select label="Statut" nativeSelectProps={{ onChange: (e) => setStatut(e.target.value), value: statut }}>
            <option value="">Tous les statuts</option>
            <option value="Transmis">Transmis</option>
            <option value="En attente">En attente</option>
            <option value="En retard">En retard</option>
            <option value="Rejeté">Rejeté</option>
          </Select>
        </div>
      </div>

      <Table data={tableData} headers={['Période', 'Ouvrage', 'Statut', 'Action']} />
    </div>
  );
};
