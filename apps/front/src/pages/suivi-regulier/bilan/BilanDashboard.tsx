import { useMemo, useState, type ChangeEvent } from 'react';
import type { BilanSteuSortByValue, BilanSclSortByValue } from '@lib/dossier';
import type { SortByValue } from '../../../hooks/useBilanFilters';
import type { ReactNode } from 'react';
import { CURRENT_BILAN_YEAR, FIRST_BILAN_YEAR } from '@lib/dossier';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { useBilanSteu, useBilanScl, useBilanSteuDetail, useBilanSclDetail } from '../../../hooks/useBilan';
import { useBilanFilters } from '../../../hooks/useBilanFilters';
import { SelectAutocomplete, type AutocompleteOption } from '../../../components/SelectAutocomplete';
import { usePointsMesure } from '../../../hooks/usePointsMesure';
import { useAsyncOuvragesSearch } from '../../../hooks/useAsyncOuvragesSearch';
import { useAsyncSystemesCollecteSearch } from '../../../hooks/useAsyncSystemesCollecteSearch';
import { getPreviousSunday } from '@lib/shared';
import { fr } from '@codegouvfr/react-dsfr';
import { SortableHeader } from '../../../components/SortableHeader';
import {
  buildBilanSteuTableHeaders,
  buildBilanSteuTableRows,
  buildBilanSclTableHeaders,
  buildBilanSclTableRows,
} from '../../../helper/bilanTableData';
import { TableLoader } from '../../../components/common/TableLoader';
import { buildPointMesureLabel } from '../../../helper/pointMesureLabel';

function formatInfoDate(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export const BilanDashboard = () => {
  const { filters, updateFilter, page, setPage } = useBilanFilters();
  const pageSize = 10;
  const [ouvrageSearch, setOuvrageSearch] = useState('');
  const [sclSearch, setSclSearch] = useState('');

  const isScl = filters.mode === 'scl';

  const { data: pmos = [] } = usePointsMesure('scl', isScl ? filters.systemeCollecteCode || null : null);
  const { data: ouvrages = [], isLoading: ouvragesLoading } = useAsyncOuvragesSearch(ouvrageSearch);
  const { data: systemesCollecte = [], isLoading: systemesCollecteLoading } = useAsyncSystemesCollecteSearch(sclSearch);

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
  const hasOuvrageSelected = !!currentOuvrageValue;
  const pointMesureOptions: AutocompleteOption[] = pmos.map((p) => ({
    value: p.pointMesureId.toString(),
    label: buildPointMesureLabel(p),
  }));

  const handleOuvrageChange = (value: string | null) => {
    const newVal = value ?? '';
    if (isScl) {
      setSclSearch(newVal);
      updateFilter({ systemeCollecteCode: newVal, pointMesureId: '' });
    } else {
      setOuvrageSearch(newVal);
      updateFilter({ ouvrageDepollutionCode: newVal });
    }
  };

  const handlePointMesureChange = (value: string | null) => {
    const newVal = value ?? '';
    updateFilter({ pointMesureId: newVal });
  };

  const handleModeChange = (mode: 'steu' | 'scl') => {
    setOuvrageSearch('');
    setSclSearch('');
    updateFilter({ mode });
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

  const {
    data: steuData,
    isLoading: steuLoading,
    isFetching: steuFetching,
  } = useBilanSteu(steuQuery, filters.mode === 'steu' && hasOuvrageSelected);
  const {
    data: sclData,
    isLoading: sclLoading,
    isFetching: sclFetching,
  } = useBilanScl(sclQuery, filters.mode === 'scl' && hasOuvrageSelected);
  const { data: steuDetail } = useBilanSteuDetail(
    isScl ? null : filters.ouvrageDepollutionCode || null,
    !isScl && hasOuvrageSelected,
  );
  const { data: sclDetail } = useBilanSclDetail(
    isScl ? filters.systemeCollecteCode || null : null,
    isScl && hasOuvrageSelected,
  );

  const data = filters.mode === 'steu' ? steuData : sclData;
  const isLoading = filters.mode === 'steu' ? steuLoading : sclLoading;
  const isFetching = filters.mode === 'steu' ? steuFetching : sclFetching;

  const handleDateSort = (nextSortBy: SortByValue, nextSortOrder: 'ASC' | 'DESC') => {
    updateFilter({ sortBy: nextSortBy, sortOrder: nextSortOrder });
  };

  const tableData = isScl ? buildBilanSclTableRows(sclData?.data || []) : buildBilanSteuTableRows(steuData?.data || []);

  const headers = isScl ? buildBilanSclTableHeaders() : buildBilanSteuTableHeaders();
  const detail = isScl ? sclDetail : steuDetail;
  const codeSandreLabel = detail
    ? 'ouvrageDepollutionCode' in detail
      ? detail.ouvrageDepollutionCode
      : detail.systemeCollecteCode
    : '-';
  const exploitantMoaLabel = detail ? [detail.exploitantNom, detail.moaNom].filter(Boolean).join(' / ') || '-' : '-';
  const siretLabel = detail ? [detail.exploitantSiret, detail.moaSiret].filter(Boolean).join(' / ') || '-' : '-';
  const steuMiseEnServiceLabel = !isScl ? formatInfoDate(steuDetail?.dateMiseEnService ?? null) : '-';

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
            hintText={<br />}
            options={[
              {
                label: 'STEU',
                nativeInputProps: {
                  checked: filters.mode === 'steu',
                  onChange: () => handleModeChange('steu'),
                },
              },
              {
                label: 'SCL',
                nativeInputProps: {
                  checked: filters.mode === 'scl',
                  onChange: () => handleModeChange('scl'),
                },
              },
            ]}
          />
        </div>
        <div className="fr-col-6 fr-col-lg-2 fr-col-xl-2">
          <Select
            label="Année"
            hint={<br />}
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
            hintText={ouvragesLoadingCurrent ? 'Recherche en cours...' : 'Saisissez au moins 2 caractères'}
            placeholder={isScl ? 'Rechercher un SCL' : 'Rechercher une station'}
            options={ouvragesOptions}
            value={currentOuvrageValue || null}
            onChange={handleOuvrageChange}
            onInputChange={isScl ? setSclSearch : setOuvrageSearch}
          />
        </div>
        {isScl && (
          <>
            <div className="fr-col-12 fr-col-lg-6 fr-col-xl-2">
              <SelectAutocomplete
                label="Point de mesures"
                hintText={'Sélectionner un point de mesure'}
                disabled={!hasOuvrageSelected}
                placeholder="Rechercher un point de mesure"
                options={pointMesureOptions}
                value={filters.pointMesureId || null}
                onChange={handlePointMesureChange}
              />
            </div>
            <div className="fr-col-12 fr-col-lg-6 fr-col-xl-2">
              <Select
                label="Statut"
                hint={<br />}
                disabled={!hasOuvrageSelected}
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

      {hasOuvrageSelected && detail && (
        <div className="fr-grid-row fr-grid-row--gutters fr-mb-3w">
          <div className="fr-col-12">
            <div className="fr-callout fr-callout--blue-ecume">
              <h2 className="fr-callout__title">Informations de l'ouvrage</h2>
              <p className="fr-mb-1v">
                <strong>Code Sandre :</strong> {codeSandreLabel}
              </p>
              {!isScl && (
                <p className="fr-mb-1v">
                  <strong>Date de mise en service :</strong> {steuMiseEnServiceLabel}
                </p>
              )}
              <p className="fr-mb-1v">
                <strong>Exploitant / MOA :</strong> {exploitantMoaLabel}
              </p>
              <p className="fr-mb-0">
                <strong>SIRET :</strong> {siretLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      <TableLoader
        isLoading={isLoading && hasOuvrageSelected}
        isFetching={isFetching}
        hasOuvrageSelected={hasOuvrageSelected}
      >
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
      </TableLoader>
    </div>
  );
};
