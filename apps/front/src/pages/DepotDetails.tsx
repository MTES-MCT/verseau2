import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { SortableHeader } from '../components/SortableHeader';
import { SelectAutocomplete } from '../components/SelectAutocomplete';
import type { AutocompleteOption } from '../components/SelectAutocomplete';
import type { MesuresSortByValue } from '@lib/dossier';
import { useMesureFilters } from '../hooks/useMesureFilters';
import { buildMesureTableRows } from '../helper/mesureTableData';
import { formatOption } from '../helper/optionsFormatter';
import Notice from '@codegouvfr/react-dsfr/Notice';
import { getPreviousSunday } from '@lib/shared';
import { useState } from 'react';

export function DepotDetailsPage() {
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
    systemesCollecte,
    systemesCollecteLoading,
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
  } = useMesureFilters();

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

  const pointsMesureOptions: AutocompleteOption[] = pointsMesure.map((option) =>
    formatOption({
      elementNomenclatureCode: String(option.pointMesureId),
      elementNomenclatureLibelle: option.pointMesureLibelle,
    }),
  );

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

  const tableData = data ? buildMesureTableRows(data.data) : [];

  const columns: { label: string; field: MesuresSortByValue | null }[] = [
    { label: 'Date', field: 'date' },
    { label: 'Point de mesure', field: null },
    { label: 'Localisation', field: null },
    { label: 'Paramètre', field: 'parametreCode' },
    { label: 'Valeur', field: 'valeur' },
    { label: 'Unité', field: null },
    { label: 'Qualification', field: null },
    { label: 'Finalité', field: null },
    { label: 'Statut', field: 'statut' },
  ];

  const headers = columns.map((col) => {
    if (!col.field) {
      return col.label;
    }

    return (
      <SortableHeader<MesuresSortByValue>
        label={col.label}
        field={col.field}
        sortBy={form.sortBy}
        sortOrder={form.sortOrder}
        onSort={setSort}
      />
    );
  });

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
                placeholder={ouvragesLoadingCurrent ? 'Chargement…' : isScl ? 'Tous les systèmes' : 'Tous les ouvrages'}
                options={ouvragesOptions}
                value={form.selectedOuvrageCode || null}
                onChange={(v) => updateForm('selectedOuvrageCode', v ?? '')}
                state={ouvrageError ? 'error' : 'default'}
                stateRelatedMessage={ouvrageError || undefined}
              />
            </div>

            <div className={fr.cx('fr-col-12', 'fr-col-md-3')}>
              <SelectAutocomplete
                label="Point de mesure"
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
            <Button onClick={handleSearch} iconId="fr-icon-search-line" iconPosition="right">
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

      {/* Table — stays mounted while paginating; opacity signals background refresh */}
      {!isLoading && !error && (
        <div style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
          <>
            <Table
              caption="Liste des mesures d'autosurveillance"
              noCaption
              bordered
              headers={headers}
              data={tableData}
              noScroll={false}
              className={fr.cx('fr-mb-1w')}
            />

            {data && (
              <div className={fr.cx('fr-mt-2w')}>
                <p className={fr.cx('fr-text--sm')}>
                  {data.total === 0
                    ? 'Aucune mesure trouvée.'
                    : `Affichage de ${(page - 1) * PAGE_SIZE + 1} à ${Math.min(page * PAGE_SIZE, data.total)} sur ${data.total} mesure${data.total > 1 ? 's' : ''}`}
                </p>
              </div>
            )}

            {totalPages > 1 && (
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
