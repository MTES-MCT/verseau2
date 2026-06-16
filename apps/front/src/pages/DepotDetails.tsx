import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { SortableHeader } from '../components/SortableHeader';
import { SelectAutocomplete } from '../components/SelectAutocomplete';
import type { AutocompleteOption } from '../components/SelectAutocomplete';
import type { MesuresSortByValue } from '@lib/dossier';
import { useMesureFilters } from '../hooks/useMesureFilters';
import { buildMesureTableHeaders, buildMesureTableRows } from '../helper/mesureTableData';
import { formatOption } from '../helper/optionsFormatter';
import { buildPointMesureLabel } from '../helper/pointMesureLabel';
import Notice from '@codegouvfr/react-dsfr/Notice';
import { ToggleSwitch } from '@codegouvfr/react-dsfr/ToggleSwitch';
import { getPreviousSunday } from '@lib/shared';
import { useState } from 'react';
import { useCsvExportDownload } from '../hooks/useCsvExportDownload';
import { useMesuresGraph } from '../hooks/useMesuresGraph';
import { downloadMesuresExport } from '../api/mesures';
import { MesuresGraph } from '../components/MesuresGraph';
import { FixedHeightTable } from '../components/common/FixedHeightTable';

export function DepotDetailsPage() {
  const [showGraph, setShowGraph] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const {
    form,
    updateForm,
    updateOuvrageType,
    updateSelectedPmo,
    handleSearch,
    setSort,
    ouvrages,
    ouvragesLoading,
    setOuvrageSearch,
    systemesCollecte,
    systemesCollecteLoading,
    setSclSearch,
    ouvrageError,
    pointsMesure,
    pointsMesureLoading,
    parametres,
    parametresLoading,
    finalites,
    finalitesLoading,
    statuts,
    statutsLoading,
    qualifications,
    qualificationsLoading,
    data,
    isLoading,
    isFetching,
    error,
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
    advancedFilterCount,
    submitted,
    submittedQuery,
    hasSearched,
  } = useMesureFilters(!showGraph);
  const {
    download: downloadCsv,
    isLoading: isExportLoading,
    downloadError,
    setDownloadError,
  } = useCsvExportDownload(downloadMesuresExport);

  const isScl = form.ouvrageType === 'scl';

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

  const pointsMesureOptions: AutocompleteOption[] = pointsMesure.map((option) => ({
    value: String(option.pointMesureId),
    label: buildPointMesureLabel(option),
  }));

  const parametresOptions: AutocompleteOption[] = parametres.map((option) =>
    formatOption({
      elementNomenclatureCode: option.parametreAnalyseCode,
      elementNomenclatureLibelle: option.parametreNomCourt,
    }),
  );

  const finalitesOptions: AutocompleteOption[] = finalites
    .slice()
    .sort((a, b) => {
      const preferred = ['1', '11', '9', '2'];
      const aIndex = preferred.indexOf(String(a.elementNomenclatureCode));
      const bIndex = preferred.indexOf(String(b.elementNomenclatureCode));

      if (aIndex === -1 && bIndex === -1) {
        return 0;
      }
      if (aIndex === -1) {
        return 1;
      }
      if (bIndex === -1) {
        return -1;
      }
      return aIndex - bIndex;
    })
    .map(formatOption);

  const statutsOptions: AutocompleteOption[] = statuts.map(formatOption);

  const qualificationsOptions: AutocompleteOption[] = qualifications.map(formatOption);

  const selectedParametreOption = parametres.find((p) => p.parametreAnalyseCode === submitted.selectedParametre);
  const parametreLabel = selectedParametreOption?.parametreNomCourt ?? submitted.selectedParametre;

  const tableData = data ? buildMesureTableRows(data.data) : [];
  const headers = buildMesureTableHeaders().map((header) => {
    const sortFieldByProperty: Partial<Record<(typeof header)['property'], MesuresSortByValue>> = {
      prelevementDate: 'date',
      parametre: 'parametreCode',
      resultatAnalyseValeur: 'valeur',
      resultatAnalyseStatut: 'statut',
    };

    const field = sortFieldByProperty[header.property];
    if (!field) {
      return header.label;
    }

    return (
      <SortableHeader<MesuresSortByValue>
        key={field}
        label={header.label}
        field={field}
        sortBy={form.sortBy}
        sortOrder={form.sortOrder}
        onSort={setSort}
      />
    );
  });

  const { graphData, graphLoading, canShowGraph, hasSubmittedGraphFilters } = useMesuresGraph(
    submittedQuery,
    showGraph,
    hasSearched,
    submitted.selectedPmoCdn,
    submitted.selectedParametre,
  );

  const handleToggleGraph = () => {
    if (showGraph) {
      setShowGraph(false);
      return;
    }

    if (canShowGraph) {
      setShowGraph(true);
    }
  };

  const canExport = hasSearched && !isLoading && !isFetching && (data?.total ?? 0) > 0;

  const handleExport = () => {
    if (!canExport) {
      return;
    }

    void downloadCsv(submittedQuery, `mesures-${submitted.ouvrageType}.csv`);
  };

  const isRechercherDisabled = showGraph && (!form.selectedPmoCdn || !form.selectedParametre);

  return (
    <div className={fr.cx('fr-container', 'fr-py-2w')}>
      <Notice
        title="Les données ne sont pas en temps réel"
        description={` - Données mises à jour le ${getPreviousSunday()}`}
        severity="info"
        className={fr.cx('fr-mb-2w')}
      />
      <h1>Détail des mesures déposées</h1>

      {/* Filters */}
      <div className={fr.cx('fr-mb-4w')}>
        {/* Zone A — Ouvrage (fieldset) */}
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }} className={fr.cx('fr-mb-3w')}>
          <legend className={fr.cx('fr-text--bold', 'fr-mb-2w')}>Ouvrage</legend>

          <RadioButtons
            legend="Type d'ouvrage"
            name="ouvrageType"
            orientation="horizontal"
            options={[
              {
                label: 'Station (STEU)',
                nativeInputProps: {
                  value: 'steu',
                  checked: form.ouvrageType === 'steu',
                  onChange: () => updateOuvrageType('steu'),
                },
              },
              {
                label: 'Système de collecte',
                nativeInputProps: {
                  value: 'scl',
                  checked: form.ouvrageType === 'scl',
                  onChange: () => updateOuvrageType('scl'),
                },
              },
            ]}
          />

          <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
            <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
              <SelectAutocomplete
                label={isScl ? 'Système de collecte' : 'Station'}
                hintText={ouvragesLoadingCurrent ? 'Recherche en cours...' : 'Saisissez au moins 2 caractères'}
                placeholder={
                  ouvragesLoadingCurrent ? 'Chargement…' : isScl ? 'Rechercher un SCL' : 'Rechercher une station'
                }
                options={ouvragesOptions}
                value={form.selectedOuvrageCode || null}
                onChange={(v) => updateForm('selectedOuvrageCode', v ?? '')}
                onInputChange={isScl ? setSclSearch : setOuvrageSearch}
                state={ouvrageError ? 'error' : 'default'}
                stateRelatedMessage={ouvrageError || undefined}
              />
            </div>

            <div className={fr.cx('fr-col-12', 'fr-col-md-3')}>
              <SelectAutocomplete
                label="Point de mesure"
                hintText={<br />}
                placeholder={
                  !form.selectedOuvrageCode
                    ? isScl
                      ? 'Sélectionnez un système'
                      : 'Sélectionnez une station'
                    : pointsMesureLoading
                      ? 'Chargement…'
                      : 'Tous les points'
                }
                options={pointsMesureOptions}
                value={form.selectedPmoCdn !== null ? String(form.selectedPmoCdn) : null}
                onChange={(v) => updateSelectedPmo(v ? Number(v) : null)}
                disabled={!form.selectedOuvrageCode || pointsMesureLoading || pointsMesure.length === 0}
              />
            </div>

            <div className={fr.cx('fr-col-12', 'fr-col-md-3')}>
              <SelectAutocomplete
                label="Paramètre"
                hintText={<br />}
                placeholder={
                  form.selectedPmoCdn === null
                    ? 'Sélectionnez un point'
                    : parametresLoading
                      ? 'Chargement…'
                      : 'Tous les paramètres'
                }
                options={parametresOptions}
                value={form.selectedParametre || null}
                onChange={(v) => updateForm('selectedParametre', v ?? '')}
                disabled={!form.selectedOuvrageCode || pointsMesureLoading || pointsMesure.length === 0}
              />
            </div>
          </div>
        </fieldset>

        {/* Zone B — Période + Rechercher */}
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-grid-row--bottom', 'fr-mb-3w')}>
          <div className={fr.cx('fr-col-12', 'fr-col-md-2')}>
            <Input
              label="Date début"
              nativeInputProps={{
                type: 'date',
                value: form.dateDebut,
                onChange: (e) => updateForm('dateDebut', e.target.value),
              }}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-2')}>
            <Input
              label="Date fin"
              nativeInputProps={{
                type: 'date',
                value: form.dateFin,
                onChange: (e) => updateForm('dateFin', e.target.value),
              }}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-2')} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              onClick={() => {
                handleSearch();
              }}
              iconId="fr-icon-search-line"
              iconPosition="right"
              disabled={isRechercherDisabled}
            >
              Rechercher
            </Button>
          </div>
        </div>

        {/* Zone C — Filtres avancés */}
        <div className={fr.cx('fr-mb-3w')}>
          <div className={fr.cx('fr-text--bold', 'fr-mb-2w')} style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="button"
              priority="tertiary"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              iconId={showAdvancedFilters ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'}
            >
              Filtres avancés
            </Button>
            {advancedFilterCount > 0 && (
              <Badge severity="info" small className={fr.cx('fr-ml-1w')}>
                {advancedFilterCount}
              </Badge>
            )}
          </div>
          {showAdvancedFilters && (
            <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-mt-2w')}>
              <div className={fr.cx('fr-col-12', 'fr-col-md-4')}>
                <SelectAutocomplete
                  label="Finalité"
                  placeholder={finalitesLoading ? 'Chargement…' : 'Toutes les finalités'}
                  options={finalitesOptions}
                  value={form.finalite || null}
                  onChange={(v) => updateForm('finalite', v ?? '')}
                />
              </div>

              <div className={fr.cx('fr-col-12', 'fr-col-md-4')}>
                <SelectAutocomplete
                  label="Statut"
                  placeholder={statutsLoading ? 'Chargement…' : 'Indifférent'}
                  options={statutsOptions}
                  value={form.statut || null}
                  onChange={(v) => updateForm('statut', v ?? '')}
                />
              </div>

              <div className={fr.cx('fr-col-12', 'fr-col-md-4')}>
                <SelectAutocomplete
                  label="Qualification"
                  placeholder={qualificationsLoading ? 'Chargement…' : 'Indifférent'}
                  options={qualificationsOptions}
                  value={form.qualification || null}
                  onChange={(v) => updateForm('qualification', v ?? '')}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Initial loading (no data yet) */}
      {isLoading && <p className={fr.cx('fr-text--sm')}>Chargement des mesures...</p>}

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          title="Erreur"
          description="Une erreur est survenue lors du chargement des mesures."
          className={fr.cx('fr-mb-4w')}
        />
      )}

      {downloadError && (
        <Alert
          severity="error"
          title="Erreur d'export"
          description={downloadError}
          closable
          onClose={() => setDownloadError(null)}
          className={fr.cx('fr-mb-4w')}
        />
      )}

      {/* Table stays mounted while paginating so previous results remain visible during refresh. */}
      {!isLoading && !error && (
        <div>
          <>
            <div className={fr.cx('fr-container')}>
              <div className={fr.cx('fr-grid-row')}>
                <div className={fr.cx('fr-col-8')}>
                  <div className={fr.cx('fr-grid-row')}>
                    <div className={fr.cx('fr-col-6')}>
                      <ToggleSwitch
                        inputTitle="Afficher le graphique"
                        label="Afficher le graphique"
                        helperText={!hasSubmittedGraphFilters && 'Recherchez avec un Point de mesure et un Paramètre'}
                        onChange={handleToggleGraph}
                        disabled={!canShowGraph}
                        showCheckedHint={false}
                      />
                    </div>

                    {data && (
                      <div className={fr.cx('fr-col-6')}>
                        {data.total === 0
                          ? 'Aucune mesure trouvée.'
                          : `Liste des mesures (${data.total} mesure${data.total > 1 ? 's' : ''})`}
                      </div>
                    )}
                  </div>
                </div>

                <div className={fr.cx('fr-col-4')}>
                  <div className={fr.cx('fr-grid-row', 'fr-grid-row--right')}>
                    <Button
                      type="button"
                      priority="secondary"
                      onClick={handleExport}
                      disabled={!canExport || isExportLoading || showGraph}
                    >
                      Exporter CSV
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {showGraph ? (
              graphLoading || graphData === undefined ? (
                <p className={fr.cx('fr-text--sm')}>Chargement du graphique...</p>
              ) : (
                <MesuresGraph data={graphData} parametreLabel={parametreLabel} />
              )
            ) : (
              <FixedHeightTable
                caption="Liste des mesures"
                noCaption
                bordered
                headers={headers}
                data={tableData}
                isFetching={isFetching}
                pageSize={PAGE_SIZE}
                rowHeight="one-line"
                noScroll={false}
                className={fr.cx('fr-mb-1w')}
              />
            )}

            {data && !showGraph && (
              <div className={fr.cx('fr-mt-2w')}>
                <p className={fr.cx('fr-text--sm')}>
                  {data.total === 0
                    ? 'Aucune mesure trouvée.'
                    : `Affichage de ${(page - 1) * PAGE_SIZE + 1} à ${Math.min(page * PAGE_SIZE, data.total)} sur ${data.total} mesure${data.total > 1 ? 's' : ''}`}
                </p>
              </div>
            )}

            {totalPages > 1 && !showGraph && (
              <div className={fr.cx('fr-mt-4w')}>
                <Pagination
                  count={totalPages}
                  defaultPage={page}
                  getPageLinkProps={(pageNumber) => ({
                    href: `#page-${pageNumber}`,
                    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                      e.preventDefault();
                      setPage(pageNumber);
                    },
                  })}
                  showFirstLast={true}
                />
              </div>
            )}
          </>
        </div>
      )}
    </div>
  );
}
