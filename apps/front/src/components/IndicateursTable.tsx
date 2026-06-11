import { formatDate } from '@lib/shared';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { useIndicateursSteu } from '../hooks/useIndicateursSteu';
import { fr } from '@codegouvfr/react-dsfr';
import { useState } from 'react';
import { SkeletonLine } from './common/Skeleton';
import './IndicateursTable.css';

const PAGE_SIZE = 10;

const SKELETON_WIDTHS = ['100px', '80px', '60px', '80px', '80px', '120px', '150px', '150px', '150px'];

export function IndicateursTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, isFetching, error } = useIndicateursSteu({ page: currentPage, pageSize: PAGE_SIZE });
  const indicateurs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

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
    'Maximum entre PC95 et débit de référence (m³/j)',
    'Capacité nominale (EH)',
    'Date validation critère conf.',
    '% volume déversé tps de pluie',
    '% flux déversé tps de pluie',
    'Nb jours de déversement moyen (5 ans)',
  ];

  const loadingData = [SKELETON_WIDTHS.map((width, index) => <SkeletonLine key={`loading-${index}`} width={width} />)];

  const formatConfNumber = (value: number | null, isEvaluated: boolean, suffix = '') => {
    if (value !== null && value !== undefined) {
      return `${value.toLocaleString('fr-FR')}${suffix}`;
    }
    return isEvaluated ? '-' : 'Non évalué';
  };

  const tableData = indicateurs
    ? indicateurs.map((indicateur) => {
        const isEvaluated = indicateur.dateValidationConformite !== null;
        return [
          <a
            key={indicateur.codeSandreSteu}
            href={`https://assainissement.developpement-durable.gouv.fr/pages/data/fiche-${indicateur.codeSandreSteu}`}
            target="_blank"
            rel="noreferrer noopener"
            className="truncate-cell"
            title={indicateur.nomSteu || indicateur.codeSandreSteu}
          >
            {indicateur.nomSteu || indicateur.codeSandreSteu}
          </a>,
          indicateur.pc95Retenu !== null ? `${indicateur.pc95Retenu.toLocaleString('fr-FR')} m³/j` : '-',
          indicateur.tailleAggloEhAnN !== null ? `${indicateur.tailleAggloEhAnN.toLocaleString('fr-FR')} EH` : '-',
          indicateur.debitReference !== null ? `${indicateur.debitReference.toLocaleString('fr-FR')} m³/j` : '-',
          indicateur.capaciteNominaleEhAnN !== null
            ? `${indicateur.capaciteNominaleEhAnN.toLocaleString('fr-FR')} EH`
            : '-',
          indicateur.dateValidationConformite ? formatDate(indicateur.dateValidationConformite) : 'Non évalué',
          formatConfNumber(indicateur.volumeDeverse5ansPc, isEvaluated, ' %'),
          formatConfNumber(indicateur.fluxDeverse5ansPc, isEvaluated, ' %'),
          formatConfNumber(indicateur.joursDeversement5ansMoy, isEvaluated),
        ];
      })
    : [];

  const isPageTransition = isFetching && !isLoading && tableData.length > 0;
  const displayedTableData = isPageTransition
    ? tableData.map((row, rowIndex) =>
        row.map((_, cellIndex) => (
          <SkeletonLine key={`page-${rowIndex}-cell-${cellIndex}`} width={SKELETON_WIDTHS[cellIndex]} />
        )),
      )
    : tableData;

  const getPageLinkProps = (pageNumber: number) => ({
    href: `#indicateurs-page-${pageNumber}`,
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      setCurrentPage(pageNumber);
    },
  });

  return (
    <div className={fr.cx('fr-mb-4w', 'fr-mt-4w')}>
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
      <Notice
        title="Indicateurs pour les réseaux uniquement de type mixtes/unitaires"
        description="(sont exclus les réseaux 100% séparatif)"
        severity="info"
        className={fr.cx('fr-mb-2w')}
      />
      <Table headers={headers} data={isLoading ? loadingData : displayedTableData} noCaption />

      {totalPages > 1 && (
        <div className="fr-mt-4w">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pagination
              count={totalPages}
              defaultPage={currentPage}
              getPageLinkProps={getPageLinkProps}
              showFirstLast={true}
            />
            <div className="fr-mb-2w fr-pt-1w" style={{ marginLeft: '1.5rem' }}>
              <p className="fr-text--sm">
                Affichage de {(currentPage - 1) * PAGE_SIZE + 1} à {Math.min(currentPage * PAGE_SIZE, total)} sur{' '}
                {total} entrées
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
