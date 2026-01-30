import { Table } from '@codegouvfr/react-dsfr/Table';
import { useIndicateursSteu } from '../hooks/useIndicateursSteu';
import { fr } from '@codegouvfr/react-dsfr';
import './IndicateursTable.css';

export function IndicateursTable() {
  const { data: indicateurs, isLoading, error } = useIndicateursSteu();

  if (error) {
    return (
      <div className={fr.cx('fr-alert', 'fr-alert--error', 'fr-mb-2w')}>
        <p>Une erreur est survenue lors du chargement des indicateurs.</p>
      </div>
    );
  }

  const headers = [
    "Système d'assainissement",
    'PC95 (m³/j)',
    'CBPO (EH)',
    'Débit de référence (m³/j)',
    'Capacité nominale (EH)',
    "Mode d'évaluation tps de pluie",
    '% volume déversé tps de pluie',
    '% flux déversé tps de pluie',
    'Nb jours de déversement moyen (5 ans)',
  ];

  // Placeholder rows to prevent layout shift during loading
  const loadingData = Array(1).fill([
    <div key="s1" className="fr-skeleton" style={{ width: '100px', height: '1rem' }} />,
    <div key="s2" className="fr-skeleton" style={{ width: '80px', height: '1rem' }} />,
    <div key="s3" className="fr-skeleton" style={{ width: '60px', height: '1rem' }} />,
    <div key="s4" className="fr-skeleton" style={{ width: '80px', height: '1rem' }} />,
    <div key="s5" className="fr-skeleton" style={{ width: '80px', height: '1rem' }} />,
    '...',
    '...',
    '...',
    '...',
  ]);

  const tableData = indicateurs
    ? indicateurs.map((ind) => [
        ind.nomSteu || ind.codeSandreSteu,
        ind.pc95Retenu !== null ? `${ind.pc95Retenu.toLocaleString('fr-FR')} m³/j` : '-',
        ind.tailleAggloEhAnN !== null ? `${ind.tailleAggloEhAnN.toLocaleString('fr-FR')} EH` : '-',
        ind.debitReference !== null ? `${ind.debitReference.toLocaleString('fr-FR')} m³/j` : '-',
        ind.capaciteNominaleEhAnN !== null ? `${ind.capaciteNominaleEhAnN.toLocaleString('fr-FR')} EH` : '-',
        'Non évalué',
        'Non évalué',
        'Non évalué',
        'Non évalué',
      ])
    : [];

  return (
    <div className={fr.cx('fr-mb-4w')}>
      <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
        <div className="fr-col">
          <h2 className="fr-h4 fr-mb-0">Principaux indicateurs</h2>
          <h3 className="fr-h6 fr-mb-0">
            Évaluation des conformités station et système de collecte - année {indicateurs?.[0]?.annee}
          </h3>
        </div>
        <div className="fr-col-auto">
          <span className="fr-badge fr-badge--info fr-badge--no-icon">Par système d'assainissement</span>
        </div>
      </div>
      <Table headers={headers} data={isLoading ? loadingData : tableData} noCaption />
    </div>
  );
}
