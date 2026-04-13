import { useMemo, type ChangeEvent } from 'react';
import type { TransmissionASRetardSteuSortByValue, TransmissionASRetardSclSortByValue } from '@lib/dossier';
import type { SortByValue } from '../../../hooks/useTransmissionASRetardFilters';
import type { ReactNode } from 'react';
import { CURRENT_TRANSMISSION_YEAR, FIRST_TRANSMISSION_YEAR } from '@lib/dossier';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { useTransmissionASRetardSteu, useTransmissionASRetardScl } from '../../../hooks/useTransmissionASRetard';
import { useTransmissionASRetardFilters } from '../../../hooks/useTransmissionASRetardFilters';
import { SelectAutocomplete, type AutocompleteOption } from '../../../components/SelectAutocomplete';
import { useOuvrages } from '../../../hooks/useOuvrages';
import { useSystemesCollecte } from '../../../hooks/useSystemesCollecte';
import { getPreviousSunday } from '@lib/shared';
import { fr } from '@codegouvfr/react-dsfr';
import { SortableHeader } from '../../../components/SortableHeader';
import {
  buildTransmissionASRetardTableHeaders,
  buildTransmissionASRetardSteuTableRows,
  buildTransmissionASRetardSclTableRows,
} from '../../../helper/transmissionASRetardTableData';

export const TransmissionASRetardDashboard = () => {
  const { filters, updateFilter, page, setPage } = useTransmissionASRetardFilters();
  const pageSize = 10;

  const isScl = filters.mode === 'scl';

  const { data: ouvrages = [], isLoading: ouvragesLoading } = useOuvrages();
  const { data: systemesCollecte = [], isLoading: systemesCollecteLoading } = useSystemesCollecte();

  const yearOptions = useMemo(
    () =>
      [CURRENT_TRANSMISSION_YEAR, CURRENT_TRANSMISSION_YEAR - 1]
        .filter((year, index, years) => year >= FIRST_TRANSMISSION_YEAR && years.indexOf(year) === index)
        .map((year) => year.toString()),
    [],
  );

  const ouvragesOptions: AutocompleteOption[] = isScl
    ? systemesCollecte.map((s) => ({
        value: s.systemeCollecteCode,
        label: s.systemeCollecteNom ?? s.systemeCollecteCode,
      }))
    : ouvrages.map((o) => ({
        value: o.ouvrageDepollutionCode,
        label: o.ouvrageDepollutionNom ?? o.ouvrageDepollutionCode,
      }));

  const ouvragesLoadingCurrent = isScl ? systemesCollecteLoading : ouvragesLoading;
  const currentOuvrageValue = filters.ouvrageCode || null;

  const handleOuvrageChange = (value: string | null) => {
    updateFilter({ ouvrageCode: value ?? '' });
  };

  const handleSort = (nextSortBy: SortByValue, nextSortOrder: 'ASC' | 'DESC') => {
    updateFilter({ sortBy: nextSortBy, sortOrder: nextSortOrder });
  };

  const steuQuery = {
    page,
    pageSize,
    year: filters.year,
    ...(filters.ouvrageCode ? { ouvrageDepollutionCode: filters.ouvrageCode } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy as TransmissionASRetardSteuSortByValue } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };

  const sclQuery = {
    page,
    pageSize,
    year: filters.year,
    ...(filters.ouvrageCode ? { systemeCollecteCode: filters.ouvrageCode } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy as TransmissionASRetardSclSortByValue } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };

  const { data: steuData } = useTransmissionASRetardSteu(steuQuery, !isScl);
  const { data: sclData } = useTransmissionASRetardScl(sclQuery, isScl);

  const data = isScl ? sclData : steuData;

  const tableData = isScl
    ? buildTransmissionASRetardSclTableRows(sclData?.data || [])
    : buildTransmissionASRetardSteuTableRows(steuData?.data || []);

  const headers = buildTransmissionASRetardTableHeaders();

  // Rendre les colonnes triables
  const sortableColumns: { label: string; field: SortByValue }[] = isScl
    ? [
        { label: 'Code Sandre', field: 'systemeCollecteCode' },
        { label: 'Nom', field: 'systemeCollecteNom' },
        { label: "Tranche d'obligation (EH)", field: 'trancheObligationLibelle' },
        { label: 'Capacité nominale (EH)', field: 'capaciteNominaleEH' },
        { label: 'Date dernier fichier reçu', field: 'dateDernierFichierRecu' },
        { label: 'Nb jours de retard', field: 'nbJoursRetard' },
      ]
    : [
        { label: 'Code Sandre', field: 'ouvrageDepollutionCode' },
        { label: 'Nom', field: 'ouvrageDepollutionNom' },
        { label: "Tranche d'obligation (EH)", field: 'trancheObligationLibelle' },
        { label: 'Capacité nominale (EH)', field: 'capaciteNominaleEH' },
        { label: 'Date dernier fichier reçu', field: 'dateDernierFichierRecu' },
        { label: 'Nb jours de retard', field: 'nbJoursRetard' },
      ];

  const finalHeaders: (string | ReactNode)[] = headers.map((header) => {
    const sortable = sortableColumns.find((s) => s.label === header);
    if (sortable) {
      return (
        <SortableHeader<SortByValue>
          key={sortable.field}
          label={sortable.label}
          field={sortable.field}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSort={handleSort}
        />
      );
    }
    return header;
  });

  const title = isScl ? 'Transmission AS des SCL en retard' : 'Transmission AS des STEU en retard';

  return (
    <div className={fr.cx('fr-container', 'fr-py-2w')}>
      <Notice
        title="Les données ne sont pas en temps réel"
        description={` - Données mises à jour le ${getPreviousSunday()}`}
        severity="info"
        className={fr.cx('fr-mb-2w')}
      />
      <h1>{title}</h1>

      <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
        <div className="fr-col-6 fr-col-lg-3 fr-col-xl-2">
          <RadioButtons
            legend="Type d'ouvrage"
            orientation="horizontal"
            options={[
              {
                label: 'STEU',
                nativeInputProps: {
                  checked: filters.mode === 'steu',
                  onChange: () => updateFilter({ mode: 'steu' }),
                },
              },
              {
                label: 'SCL',
                nativeInputProps: {
                  checked: filters.mode === 'scl',
                  onChange: () => updateFilter({ mode: 'scl' }),
                },
              },
            ]}
          />
        </div>
        <div className="fr-col-6 fr-col-lg-2 fr-col-xl-2">
          <Select
            label="Année"
            nativeSelectProps={{
              value: filters.year.toString(),
              onChange: (e: ChangeEvent<HTMLSelectElement>) => updateFilter({ year: parseInt(e.target.value) }),
            }}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </div>
        <div className="fr-col-12 fr-col-lg-7 fr-col-xl-6">
          <SelectAutocomplete
            label={isScl ? 'Système de collecte' : 'Station'}
            placeholder={ouvragesLoadingCurrent ? 'Chargement...' : isScl ? 'Tous les systèmes' : 'Toutes les stations'}
            options={ouvragesOptions}
            value={currentOuvrageValue}
            onChange={handleOuvrageChange}
          />
        </div>
      </div>

      <Table data={tableData} headers={finalHeaders} />
      {Math.ceil((data?.total || 0) / pageSize) > 1 && (
        <Pagination
          count={Math.ceil((data?.total || 0) / pageSize)}
          defaultPage={page}
          getPageLinkProps={(pageNumber: number) => ({
            href: `#page-${pageNumber}`,
            onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              setPage(pageNumber);
            },
          })}
        />
      )}
    </div>
  );
};
