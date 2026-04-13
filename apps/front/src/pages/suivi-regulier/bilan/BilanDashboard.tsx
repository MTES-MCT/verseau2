import { useMemo, type ChangeEvent } from 'react';
import type { BilanSteuSortByValue, BilanSclSortByValue } from '@lib/dossier';
import type { SortByValue } from '../../../hooks/useBilanFilters';
import type { ReactNode } from 'react';
import { CURRENT_BILAN_YEAR, FIRST_BILAN_YEAR } from '@lib/dossier';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { useBilanSteu, useBilanScl } from '../../../hooks/useBilan';
import { useBilanFilters } from '../../../hooks/useBilanFilters';
import { SelectAutocomplete, type AutocompleteOption } from '../../../components/SelectAutocomplete';
import { useOuvrages } from '../../../hooks/useOuvrages';
import { useSystemesCollecte } from '../../../hooks/useSystemesCollecte';
import { usePointsMesure } from '../../../hooks/usePointsMesure';
import { getPreviousSunday } from '@lib/shared';
import { fr } from '@codegouvfr/react-dsfr';
import { SortableHeader } from '../../../components/SortableHeader';
import {
  buildBilanSteuTableHeaders,
  buildBilanSteuTableRows,
  buildBilanSclTableHeaders,
  buildBilanSclTableRows,
} from '../../../helper/bilanTableData';

export const BilanDashboard = () => {
  const { filters, updateFilter, page, setPage } = useBilanFilters();
  const pageSize = 10;

  const isScl = filters.mode === 'scl';

  const { data: pmos } = usePointsMesure('scl', isScl ? filters.systemeCollecteCode || null : null);
  const { data: ouvrages = [], isLoading: ouvragesLoading } = useOuvrages();
  const { data: systemesCollecte = [], isLoading: systemesCollecteLoading } = useSystemesCollecte();

  const yearOptions = useMemo(
    () =>
      [CURRENT_BILAN_YEAR, CURRENT_BILAN_YEAR - 1]
        .filter((year, index, years) => year >= FIRST_BILAN_YEAR && years.indexOf(year) === index)
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
  const currentOuvrageValue = isScl ? filters.systemeCollecteCode : filters.ouvrageDepollutionCode;

  const handleOuvrageChange = (value: string | null) => {
    const newVal = value ?? '';
    if (isScl) {
      updateFilter({ systemeCollecteCode: newVal, pointMesureId: '' });
    } else {
      updateFilter({ ouvrageDepollutionCode: newVal });
    }
  };

  const steuQuery = {
    page,
    pageSize,
    year: filters.year,
    ...(filters.ouvrageDepollutionCode ? { ouvrageDepollutionCode: filters.ouvrageDepollutionCode } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy as BilanSteuSortByValue } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };

  const sclQuery = {
    page,
    pageSize,
    year: filters.year,
    ...(filters.systemeCollecteCode ? { systemeCollecteCode: filters.systemeCollecteCode } : {}),
    ...(filters.pointMesureId ? { pointMesureId: Number(filters.pointMesureId) } : {}),
    ...(filters.statut ? { statut: filters.statut } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy as BilanSclSortByValue } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };

  const { data: steuData } = useBilanSteu(steuQuery, filters.mode === 'steu');
  const { data: sclData } = useBilanScl(sclQuery, filters.mode === 'scl');

  const data = filters.mode === 'steu' ? steuData : sclData;

  const handleDateSort = (nextSortBy: SortByValue, nextSortOrder: 'ASC' | 'DESC') => {
    updateFilter({ sortBy: nextSortBy, sortOrder: nextSortOrder });
  };

  const tableData = isScl ? buildBilanSclTableRows(sclData?.data || []) : buildBilanSteuTableRows(steuData?.data || []);

  const headers = isScl ? buildBilanSclTableHeaders() : buildBilanSteuTableHeaders();

  // replace "Date" with SortableHeader
  const dateIndex = headers.indexOf('Date');
  const finalHeaders: (string | ReactNode)[] = [...headers];
  if (dateIndex !== -1) {
    finalHeaders[dateIndex] = (
      <SortableHeader<SortByValue>
        key="date"
        label="Date"
        field="date"
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSort={handleDateSort}
      />
    );
  }

  return (
    <div className={fr.cx('fr-container', 'fr-py-2w')}>
      <Notice
        title="Les données ne sont pas en temps réel"
        description={` - Données mises à jour le ${getPreviousSunday()}`}
        severity="info"
        className={fr.cx('fr-mb-2w')}
      />
      <h1>Tableau de bord bilans</h1>

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
        <div className={`fr-col-12 fr-col-lg-7 ${isScl ? 'fr-col-xl-4' : 'fr-col-xl-6'}`}>
          <SelectAutocomplete
            label={isScl ? 'Système de collecte' : 'Station'}
            placeholder={ouvragesLoadingCurrent ? 'Chargement...' : isScl ? 'Tous les systèmes' : 'Toutes les stations'}
            options={ouvragesOptions}
            value={currentOuvrageValue || null}
            onChange={handleOuvrageChange}
          />
        </div>

        {isScl && (
          <>
            <div className="fr-col-12 fr-col-lg-6 fr-col-xl-2">
              <Select
                label="Point de mesures"
                nativeSelectProps={{
                  value: filters.pointMesureId,
                  onChange: (e: ChangeEvent<HTMLSelectElement>) => updateFilter({ pointMesureId: e.target.value }),
                }}
              >
                <option value="">Tous les points</option>
                {(pmos || []).map((p) => (
                  <option key={p.pointMesureId} value={p.pointMesureId.toString()}>
                    {p.pointMesureNumero} - {p.pointMesureLibelle}
                  </option>
                ))}
              </Select>
            </div>
            <div className="fr-col-12 fr-col-lg-6 fr-col-xl-2">
              <Select
                label="Statut"
                nativeSelectProps={{
                  value: filters.statut,
                  onChange: (e: ChangeEvent<HTMLSelectElement>) =>
                    updateFilter({ statut: e.target.value as 'TP' | 'TS' | '' }),
                }}
              >
                <option value="">Tous les statuts</option>
                <option value="TP">TP</option>
                <option value="TS">TS</option>
              </Select>
            </div>
          </>
        )}
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
