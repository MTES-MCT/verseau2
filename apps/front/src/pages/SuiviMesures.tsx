import { useState, useMemo } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { MOCK_MESURES } from '../data/mockMesures';

export const SuiviMesuresPage = () => {
  const [ouvrage, setOuvrage] = useState('');
  const [pointMesure, setPointMesure] = useState('');
  const [parametre, setParametre] = useState('');
  const [qualification, setQualification] = useState('');
  const [periode, setPeriode] = useState('');

  const ouvrages = useMemo(() => Array.from(new Set(MOCK_MESURES.map((m) => m.ouvrage))), []);
  const pointsMesure = useMemo(() => Array.from(new Set(MOCK_MESURES.map((m) => m.pointMesure))), []);
  const parametres = useMemo(() => Array.from(new Set(MOCK_MESURES.map((m) => m.parametre))), []);

  const filteredMesures = useMemo(() => {
    return MOCK_MESURES.filter((m) => {
      return (
        (ouvrage === '' || m.ouvrage.toLowerCase().includes(ouvrage.toLowerCase())) &&
        (pointMesure === '' || m.pointMesure.toLowerCase().includes(pointMesure.toLowerCase())) &&
        (parametre === '' || m.parametre.toLowerCase().includes(parametre.toLowerCase())) &&
        (qualification === '' || m.qualification === qualification) &&
        (periode === '' || m.date.startsWith(periode))
      );
    });
  }, [ouvrage, pointMesure, parametre, qualification, periode]);

  const tableData = filteredMesures.map((m) => [
    m.date,
    m.ouvrage,
    m.pointMesure,
    m.parametre,
    `${m.valeur} ${m.unite}`,
    <Badge severity={m.qualification === 'Brut' ? 'info' : 'success'}>{m.qualification}</Badge>,
  ]);

  return (
    <div className={fr.cx('fr-container', 'fr-py-4w')}>
      <h1 className={fr.cx('fr-h1')}>Suivi des mesures d'auto-surveillance</h1>
      <p className={fr.cx('fr-text--lead')}>Visualisez le détail de vos mesures déposées et leur qualification.</p>

      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-mb-4w')}>
        <div className={fr.cx('fr-col-12', 'fr-col-md-4')}>
          <Input
            label="Ouvrage (recherche)"
            nativeInputProps={{
              onChange: (e) => setOuvrage(e.target.value),
              value: ouvrage,
              list: 'ouvrages-list',
            }}
          />
          <datalist id="ouvrages-list">
            {ouvrages.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-4')}>
          <Input
            label="Point de mesure (recherche)"
            nativeInputProps={{
              onChange: (e) => setPointMesure(e.target.value),
              value: pointMesure,
              list: 'points-mesure-list',
            }}
          />
          <datalist id="points-mesure-list">
            {pointsMesure.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-4')}>
          <Input
            label="Paramètre (recherche)"
            nativeInputProps={{
              onChange: (e) => setParametre(e.target.value),
              value: parametre,
              list: 'parametres-list',
            }}
          />
          <datalist id="parametres-list">
            {parametres.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-4')}>
          <Select
            label="Qualification"
            nativeSelectProps={{ onChange: (e) => setQualification(e.target.value), value: qualification }}
          >
            <option value="">Toutes qualifications</option>
            <option value="Brut">Brut</option>
            <option value="Qualifié">Qualifié</option>
          </Select>
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-4')}>
          <Input
            label="Période (AAAA-MM)"
            nativeInputProps={{ onChange: (e) => setPeriode(e.target.value), value: periode, placeholder: '2025-03' }}
          />
        </div>
      </div>

      <Table
        data={tableData}
        headers={['Date', 'Ouvrage', 'Point de mesure', 'Paramètre', 'Valeur', 'Qualification']}
      />
    </div>
  );
};
