import type { ChangeEvent } from 'react';
import type {
  BilanSclSortByValue,
  BilanSclDto,
  BilanSteuDto,
  BilanSteuSortByValue,
  IntervenantDetailDto,
  PaginatedBilanSclResponse,
  PaginatedBilanSteuResponse,
} from '@lib/dossier';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Tooltip } from '@codegouvfr/react-dsfr/Tooltip';
import { BILAN_UNAVAILABLE_MESSAGE, useBilanDashboard } from '../../../hooks/useBilanDashboard';
import { SelectAutocomplete } from '../../../components/SelectAutocomplete';
import { getPreviousSunday } from '@lib/shared';
import { fr } from '@codegouvfr/react-dsfr';
import { SortableHeader } from '../../../components/SortableHeader';
import {
  buildBilanSclTableHeaders,
  buildBilanSclTableRows,
  buildBilanSteuTableHeaders,
  buildBilanSteuTableRows,
} from '../../../helper/bilanTableData';
import { TableLoader } from '../../../components/common/TableLoader';
import { FixedHeightTable } from '../../../components/common/FixedHeightTable';

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

function formatIntervenants(intervenants: IntervenantDetailDto[], key: 'intervenantNom' | 'intervenantSiret'): string {
  return (
    intervenants
      .map((intervenant) => intervenant[key])
      .filter(Boolean)
      .join(' / ') || '-'
  );
}

export const BilanDashboard = () => {
  const {
    filters,
    updateFilter,
    page,
    setPage,
    pageSize,
    issues,
    normalizationWarnings,
    dismissNormalizationWarnings,
    isScl,
    hasOuvrageSelected,
    currentOuvrageValue,
    yearOptions,
    setOuvrageSearch,
    setSclSearch,
    ouvragesOptions,
    ouvragesLoadingCurrent,
    pointMesureOptions,
    parametreOptions,
    parametresLoading,
    resourceStatus,
    detail,
    steuDetail,
    retryResource,
    displayData,
    total,
    isListPending,
    isListFetching,
    canExport,
    isExportLoading,
    downloadError,
    setDownloadError,
    handleExport,
    handleOuvrageChange,
    handlePointMesureChange,
    handleModeChange,
    handleParametreChange,
    handleDateSort,
    getPageHref,
  } = useBilanDashboard();

  const issueFor = (field: string) => issues.find((issue) => issue.field === field);
  const yearIssue = issueFor('year');
  const statutIssue = issueFor('statut');
  const pointIssue = issueFor('pointMesureId');
  const parametreIssue = issueFor('parametreCode');

  const showResourceLoader =
    hasOuvrageSelected && issues.length === 0 && (resourceStatus === 'loading' || isListPending);

  const tableData = isScl
    ? buildBilanSclTableRows(((displayData as PaginatedBilanSclResponse | undefined)?.data ?? []) as BilanSclDto[])
    : buildBilanSteuTableRows(
        ((displayData as PaginatedBilanSteuResponse | undefined)?.data ?? []) as BilanSteuDto[],
      );

  let headers;
  if (isScl) {
    headers = buildBilanSclTableHeaders().map((header) => {
      if (header.property !== 'date') {
        return header.label;
      }

      return (
        <SortableHeader<BilanSclSortByValue>
          key="date"
          label={header.label}
          field="date"
          sortBy={filters.sortBy as BilanSclSortByValue | undefined}
          sortOrder={filters.sortOrder}
          onSort={handleDateSort as (nextSortBy: BilanSclSortByValue, nextSortOrder: 'ASC' | 'DESC') => void}
        />
      );
    });
  } else {
    headers = buildBilanSteuTableHeaders().map((header) => {
      if (header.property === 'hcnf') {
        return (
          <span key="hcnf">
            {header.label} <Tooltip title="Hors condition normale de fonctionnement (Débit A3 > Débit de référence)" />
          </span>
        );
      }

      if (header.property !== 'date') {
        return header.label;
      }

      return (
        <SortableHeader<BilanSteuSortByValue>
          key="date"
          label={header.label}
          field="date"
          sortBy={filters.sortBy as BilanSteuSortByValue | undefined}
          sortOrder={filters.sortOrder}
          onSort={handleDateSort as (nextSortBy: BilanSteuSortByValue, nextSortOrder: 'ASC' | 'DESC') => void}
        />
      );
    });
  }

  const codeSandreLabel = detail
    ? 'ouvrageDepollutionCode' in detail
      ? detail.ouvrageDepollutionCode
      : detail.systemeCollecteCode
    : '-';
  const detailIntervenants = detail ? [...detail.exploitants, ...detail.maitresOuvrage] : [];
  const exploitantMoaLabel = formatIntervenants(detailIntervenants, 'intervenantNom');
  const siretLabel = formatIntervenants(detailIntervenants, 'intervenantSiret');
  const steuMiseEnServiceLabel = !isScl ? formatInfoDate(steuDetail?.dateMiseEnService ?? null) : '-';

  const showDetail = resourceStatus === 'ready' && detail;

  return (
    <div className={fr.cx('fr-container', 'fr-py-2w')}>
      <Notice
        title="Les données ne sont pas en temps réel"
        description={` - Données mises à jour le ${getPreviousSunday()}`}
        severity="info"
        className={fr.cx('fr-mb-2w')}
      />
      <h1>Tableau de bord bilans</h1>

      {downloadError && (
        <Alert
          severity="error"
          title="Erreur d'export"
          description={downloadError}
          closable
          onClose={() => setDownloadError(null)}
          className={fr.cx('fr-mb-2w')}
        />
      )}

      {normalizationWarnings.map((warning, index) => (
        <Alert
          key={`normalization-${index}`}
          severity="warning"
          title="URL corrigée"
          description={warning}
          closable
          onClose={dismissNormalizationWarnings}
          className={fr.cx('fr-mb-2w')}
        />
      ))}

      {issues.map((issue) => (
        <Alert
          key={`${issue.field}-${issue.code}`}
          severity="error"
          title="Sélection invalide"
          description={issue.message}
          className={fr.cx('fr-mb-2w')}
        />
      ))}

      {issues.length === 0 && resourceStatus === 'unavailable' && (
        <Alert severity="error" title="Ouvrage indisponible" description={BILAN_UNAVAILABLE_MESSAGE} className={fr.cx('fr-mb-2w')} />
      )}

      {issues.length === 0 && resourceStatus === 'error' && (
        <Alert
          severity="error"
          title="Erreur de chargement"
          description="Le chargement des informations de l’ouvrage a échoué. Votre sélection a été conservée, vous pouvez réessayer."
          className={fr.cx('fr-mb-2w')}
        />
      )}
      {issues.length === 0 && resourceStatus === 'error' && (
        <div className={fr.cx('fr-mb-2w')}>
          <Button type="button" priority="secondary" onClick={retryResource}>
            Réessayer
          </Button>
        </div>
      )}

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
            state={yearIssue ? 'error' : 'default'}
            stateRelatedMessage={yearIssue?.message}
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
        <div className={`fr-col-12 fr-col-lg-4 ${isScl ? 'fr-col-xl-4' : 'fr-col-xl-5'}`}>
          <SelectAutocomplete
            label={isScl ? 'Système de collecte' : 'Station'}
            hintText={ouvragesLoadingCurrent ? 'Recherche en cours...' : 'Saisissez au moins 2 caractères'}
            placeholder={isScl ? 'Rechercher un SCL' : 'Rechercher une station'}
            options={ouvragesOptions}
            value={currentOuvrageValue || null}
            onChange={handleOuvrageChange}
            onInputChange={isScl ? setSclSearch : setOuvrageSearch}
            clientSideFilter={false}
            isFetching={ouvragesLoadingCurrent}
          />
        </div>
        {!isScl && (
          <div className="fr-col-12 fr-col-lg-3 fr-col-xl-3">
            <SelectAutocomplete
              label="Paramètre"
              hintText={<br />}
              placeholder={parametresLoading ? 'Chargement…' : 'Tous les paramètres'}
              options={parametreOptions}
              value={filters.parametreCode || null}
              onChange={handleParametreChange}
              state={parametreIssue ? 'error' : 'default'}
              stateRelatedMessage={parametreIssue?.message}
            />
          </div>
        )}
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
                state={pointIssue ? 'error' : 'default'}
                stateRelatedMessage={pointIssue?.message}
              />
            </div>
            <div className="fr-col-12 fr-col-lg-6 fr-col-xl-2">
              <Select
                label="Statut"
                hint={<br />}
                disabled={!hasOuvrageSelected}
                state={statutIssue ? 'error' : 'default'}
                stateRelatedMessage={statutIssue?.message}
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

      {showDetail && (
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
        isLoading={showResourceLoader}
        isFetching={isListFetching}
        hasOuvrageSelected={hasOuvrageSelected}
      >
        <div className={fr.cx('fr-mb-2w')} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="button" priority="secondary" onClick={handleExport} disabled={!canExport || isExportLoading}>
            Exporter CSV
          </Button>
        </div>
        <FixedHeightTable
          data={tableData}
          headers={headers}
          isFetching={isListFetching}
          pageSize={pageSize}
          rowHeight="one-line"
        />
        {Math.ceil(total / pageSize) > 1 && (
          <Pagination
            key={page}
            count={Math.ceil(total / pageSize)}
            defaultPage={page}
            getPageLinkProps={(pageNumber: number) => ({
              href: getPageHref(pageNumber),
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
