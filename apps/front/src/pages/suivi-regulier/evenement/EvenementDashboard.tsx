import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { EvenementSteuDto, EvenementSclDto, EvenementSteuSortByValue } from '@lib/dossier';
import { CURRENT_EVENEMENT_YEAR, FIRST_EVENEMENT_YEAR } from '@lib/dossier';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { useEvenementSteu, useEvenementScl, useEvenementTypes } from '../../../hooks/useEvenement';
import { useEvenementFilters } from '../../../hooks/useEvenementFilters';
import { renderPrisEnCompteBadge } from '../../../helper/evenementTableData';
import { SelectAutocomplete, type AutocompleteOption } from '../../../components/SelectAutocomplete';
import { usePointsMesure } from '../../../hooks/usePointsMesure';
import { formatDate, getPreviousSunday } from '@lib/shared';
import { fr } from '@codegouvfr/react-dsfr';
import { SortableHeader } from '../../../components/SortableHeader';
import { useAsyncOuvragesSearch } from '../../../hooks/useAsyncOuvragesSearch';
import { useAsyncSystemesCollecteSearch } from '../../../hooks/useAsyncSystemesCollecteSearch';
import { TableLoader } from '../../../components/common/TableLoader';

export const EvenementDashboard = () => {
  const { filters, updateFilter, page, setPage } = useEvenementFilters();
  const pageSize = 10;
  const [ouvrageSearch, setOuvrageSearch] = useState('');
  const [sclSearch, setSclSearch] = useState('');
  const isScl = filters.mode === 'scl';

  const { data: types } = useEvenementTypes();
  const pointsMesureOuvrageType = isScl ? 'scl' : 'steu';
  const pointsMesureOuvrageCode = isScl ? filters.systemeCollecteCode || null : filters.ouvrageDepollutionCode || null;
  const { data: pmos = [] } = usePointsMesure(pointsMesureOuvrageType, pointsMesureOuvrageCode);
  const { data: ouvrages = [], isLoading: ouvragesLoading } = useAsyncOuvragesSearch(ouvrageSearch);
  const { data: systemesCollecte = [], isLoading: systemesCollecteLoading } = useAsyncSystemesCollecteSearch(sclSearch);

  const yearOptions = useMemo(
    () =>
      [CURRENT_EVENEMENT_YEAR, CURRENT_EVENEMENT_YEAR - 1]
        .filter((year, index, years) => year >= FIRST_EVENEMENT_YEAR && years.indexOf(year) === index)
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
    label: `${p.pointMesureNumero} - ${p.pointMesureLibelle ?? ''}`.trim().replace(/ -$/, ''),
  }));

  const handleOuvrageChange = (value: string | null) => {
    const newVal = value ?? '';
    if (isScl) {
      setSclSearch(newVal);
      updateFilter({ systemeCollecteCode: newVal, pointMesureId: '' });
    } else {
      setOuvrageSearch(newVal);
      updateFilter({ ouvrageDepollutionCode: newVal, pointMesureId: '' });
    }
  };

  const handlePointMesureChange = (value: string | null) => {
    const newVal = value ?? '';
    updateFilter({ pointMesureId: newVal });
  };

  useEffect(() => {
    if (isScl) {
      setOuvrageSearch('');
      return;
    }
    setOuvrageSearch(filters.ouvrageDepollutionCode);
  }, [filters.ouvrageDepollutionCode, isScl]);

  useEffect(() => {
    if (!isScl) {
      setSclSearch('');
      return;
    }
    setSclSearch(filters.systemeCollecteCode);
  }, [filters.systemeCollecteCode, isScl]);

  const steuQuery = {
    page,
    pageSize,
    year: filters.year,
    ...(filters.typeEvenementCode ? { typeEvenementCode: filters.typeEvenementCode } : {}),
    ...(filters.ouvrageDepollutionCode ? { ouvrageDepollutionCode: filters.ouvrageDepollutionCode } : {}),
    ...(filters.pointMesureId ? { pointMesureId: Number(filters.pointMesureId) } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy as EvenementSteuSortByValue } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };

  const sclQuery = {
    page,
    pageSize,
    year: filters.year,
    ...(filters.typeEvenementCode ? { typeEvenementCode: filters.typeEvenementCode } : {}),
    ...(filters.systemeCollecteCode ? { systemeCollecteCode: filters.systemeCollecteCode } : {}),
    ...(filters.pointMesureId ? { pointMesureId: Number(filters.pointMesureId) } : {}),
    ...(filters.sortBy ? { sortBy: filters.sortBy } : {}),
    ...(filters.sortOrder ? { sortOrder: filters.sortOrder } : {}),
  };

  const {
    data: steuData,
    isLoading: steuLoading,
    isFetching: steuFetching,
  } = useEvenementSteu(steuQuery, filters.mode === 'steu' && hasOuvrageSelected);
  const {
    data: sclData,
    isLoading: sclLoading,
    isFetching: sclFetching,
  } = useEvenementScl(sclQuery, filters.mode === 'scl' && hasOuvrageSelected);

  const data = filters.mode === 'steu' ? steuData : sclData;
  const isLoading = filters.mode === 'steu' ? steuLoading : sclLoading;
  const isFetching = filters.mode === 'steu' ? steuFetching : sclFetching;

  const getTableData = (row: EvenementSteuDto | EvenementSclDto) => {
    const codeSandre =
      filters.mode === 'scl' ? (row as EvenementSclDto).systemeCollecteCode : row.ouvrageDepollutionCode;
    const nom = filters.mode === 'scl' ? (row as EvenementSclDto).systemeCollecteNom : row.ouvrageDepollutionNom;

    const baseRow = [
      renderPrisEnCompteBadge(row.prisEnCompte),
      codeSandre,
      nom ?? '-',
      formatDate(row.date),
      `${row.typeEvenementCode}-${row.typeEvenementLibelle}`,
      row.finalite ?? '-',
      row.commentaire ?? '-',
    ];

    if (filters.mode === 'scl') {
      const sclRow = row as EvenementSclDto;
      return [...baseRow, `${sclRow.pointMesureNumero} - ${sclRow.pointMesureLibelle ?? '-'}`];
    }
    return baseRow;
  };

  const handleDateSort = (nextSortBy: EvenementSteuSortByValue, nextSortOrder: 'ASC' | 'DESC') => {
    updateFilter({ sortBy: nextSortBy, sortOrder: nextSortOrder });
  };

  return (
    <div className={fr.cx('fr-container', 'fr-py-2w')}>
      <Notice
        title="Les données ne sont pas en temps réel"
        description={` - Données mises à jour le ${getPreviousSunday()}`}
        severity="info"
        className={fr.cx('fr-mb-2w')}
      />
      <h1>Tableau de bord événements</h1>

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
                  onChange: () => updateFilter({ mode: 'steu', typeEvenementCode: '' }),
                },
              },
              {
                label: 'SCL',
                nativeInputProps: {
                  checked: filters.mode === 'scl',
                  onChange: () => updateFilter({ mode: 'scl', typeEvenementCode: '' }),
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
        <div className={`fr-col-12 fr-col-lg-7 ${filters.mode === 'steu' ? 'fr-col-xl-6' : 'fr-col-xl-4'}`}>
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
        {!isScl && (
          <div className="fr-col-12 fr-col-lg-6 fr-col-xl-2">
            <SelectAutocomplete
              label="Point de mesures"
              hintText={hasOuvrageSelected ? 'Effacez la sélection pour tous les points' : undefined}
              placeholder="Rechercher un point de mesure"
              options={pointMesureOptions}
              value={filters.pointMesureId || null}
              onChange={handlePointMesureChange}
              disabled={!hasOuvrageSelected}
            />
          </div>
        )}
        <div className="fr-col-12 fr-col-lg-6 fr-col-xl-2">
          <Select
            label="Type d'événement"
            hint={<br />}
            disabled={!hasOuvrageSelected}
            nativeSelectProps={{
              value: filters.typeEvenementCode,
              onChange: (e: ChangeEvent<HTMLSelectElement>) => updateFilter({ typeEvenementCode: e.target.value }),
            }}
          >
            <option value="">Tous les types</option>
            {(types || []).map((t) => (
              <option key={t.elementNomenclatureCode} value={t.elementNomenclatureCode}>
                {t.elementNomenclatureLibelle}
              </option>
            ))}
          </Select>
        </div>
        {filters.mode === 'scl' && (
          <div className="fr-col-12 fr-col-lg-6 fr-col-xl-2">
            <SelectAutocomplete
              label="Point de mesures"
              hintText={hasOuvrageSelected ? 'Effacez la sélection pour tous les points' : undefined}
              disabled={!hasOuvrageSelected}
              placeholder="Rechercher un point de mesure"
              options={pointMesureOptions}
              value={filters.pointMesureId || null}
              onChange={handlePointMesureChange}
            />
          </div>
        )}
      </div>

      <TableLoader
        isLoading={isLoading && hasOuvrageSelected}
        isFetching={isFetching}
        hasOuvrageSelected={hasOuvrageSelected}
      >
        <Table
          data={(data?.data || []).map(getTableData)}
          headers={[
            'Pris en compte',
            'Code Sandre',
            'Nom',
            <SortableHeader
              key="date"
              label="Date"
              field="date"
              sortBy={filters.sortBy as EvenementSteuSortByValue | undefined}
              sortOrder={filters.sortOrder}
              onSort={handleDateSort}
            />,
            "Type d'événement",
            'Finalité',
            'Commentaire',
            ...(filters.mode === 'scl' ? ['Point de mesures'] : []),
          ]}
        />
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
