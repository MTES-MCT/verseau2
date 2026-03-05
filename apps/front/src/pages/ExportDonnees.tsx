import { useState, useMemo } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { MOCK_MESURES } from '../data/mockMesures';

export const ExportDonneesPage = () => {
  const [ouvrage, setOuvrage] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [type, setType] = useState('Complet');

  const ouvrages = useMemo(() => Array.from(new Set(MOCK_MESURES.map((m) => m.ouvrage))), []);

  const handleExport = () => {
    const filtered = MOCK_MESURES.filter((m) => {
      return (
        (ouvrage === '' || m.ouvrage === ouvrage) &&
        (dateDebut === '' || m.date >= dateDebut) &&
        (dateFin === '' || m.date <= dateFin) &&
        (type === 'Complet' || m.qualification === type)
      );
    });

    const headers = ['Date', 'Ouvrage', 'Point de mesure', 'Paramètre', 'Valeur', 'Qualification'];
    const rows = filtered.map((m) => [
      m.date,
      m.ouvrage,
      m.pointMesure,
      m.parametre,
      `${m.valeur} ${m.unite}`,
      m.qualification,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `export_autosurveillance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className={fr.cx('fr-container', 'fr-py-4w')}>
      <h1 className={fr.cx('fr-h1')}>Export des données</h1>
      <p className={fr.cx('fr-text--lead')}>Extrayez vos données d'autosurveillance pour vos analyses externes.</p>

      <Alert small description="Données basées sur le référentiel J-7." severity="info" className={fr.cx('fr-mb-4w')} />

      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-mb-4w')}>
        <div className={fr.cx('fr-col-12', 'fr-col-md-3')}>
          <Select label="Ouvrage" nativeSelectProps={{ onChange: (e) => setOuvrage(e.target.value), value: ouvrage }}>
            <option value="">Tous les ouvrages</option>
            {ouvrages.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-3')}>
          <Input
            label="Date de début"
            nativeInputProps={{
              type: 'date',
              onChange: (e) => setDateDebut(e.target.value),
              value: dateDebut,
            }}
          />
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-3')}>
          <Input
            label="Date de fin"
            nativeInputProps={{
              type: 'date',
              onChange: (e) => setDateFin(e.target.value),
              value: dateFin,
            }}
          />
        </div>
        <div className={fr.cx('fr-col-12', 'fr-col-md-3')}>
          <Select label="Type de données" nativeSelectProps={{ onChange: (e) => setType(e.target.value), value: type }}>
            <option value="Complet">Complet</option>
            <option value="Brut">Brut</option>
            <option value="Qualifié">Qualifié</option>
          </Select>
        </div>
      </div>

      <Button onClick={handleExport} iconId="fr-icon-download-line">
        Télécharger l'export (CSV)
      </Button>
    </div>
  );
};
