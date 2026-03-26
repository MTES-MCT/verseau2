import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { SelectAutocomplete } from '../components/SelectAutocomplete';
import type { AutocompleteOption } from '../components/SelectAutocomplete';
import type { MesuresSortByValue } from '@lib/dossier';
import { useMesureFilters } from '../hooks/useMesureFilters';
import { buildMesureTableRows } from '../helper/mesureTableData';
import { formatOption } from '../helper/optionsFormatter';
import Notice from '@codegouvfr/react-dsfr/Notice';
import { getPreviousSunday } from '@lib/shared';

export function DepotDetailsPage() {
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
  } = useMesureFilters();

  const isScl = form.ouvrageType === 'scl';

  const ouvragesOptions: AutocompleteOption[] = isScl
    ? systemesCollecte.map((s) => ({
        value: s.codeSystemeCollecte,
        label: s.nomSystemeCollecte ?? s.codeSystemeCollecte,
      }))
    : ouvrages.map((o) => ({
        value: o.codeOuvrageDepollution,
        label: o.nomOuvrageDepollution ?? o.codeOuvrageDepollution,
      }));

  const ouvragesLoadingCurrent = isScl ? systemesCollecteLoading : ouvragesLoading;

  const pointsMesureOptions: AutocompleteOption[] = pointsMesure.map((option) =>
    formatOption({
      codeElementNomenclature: String(option.identifiantPointMesure),
      libelleElementNomenclature: option.libellePointMesure,
    }),
  );

  const parametresOptions: AutocompleteOption[] = parametres.map((option) =>
    formatOption({
      codeElementNomenclature: option.codeParametreAnalyse,
      libelleElementNomenclature: option.nomCourtParametre,
    }),
  );

  const finalitesOptions: AutocompleteOption[] = finalites
    .slice()
    .sort((a, b) => {
      const preferred = ['1', '11', '9', '2'];
      const aIndex = preferred.indexOf(String(a.codeElementNomenclature));
      const bIndex = preferred.indexOf(String(b.codeElementNomenclature));

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

    const isSorted = form.sortBy === col.field;
    const order = isSorted ? form.sortOrder : null;

    return (
      <button
        type="button"
        onClick={() => setSort(col.field!, isSorted && order === 'ASC' ? 'DESC' : 'ASC')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {col.label}
        {isSorted && (
          <span className={fr.cx(order === 'ASC' ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line')} />
        )}
      </button>
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
        {/* Sélection du type d'ouvrage */}
        <div className={fr.cx('fr-mb-3w')}>
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
        </div>

        {/* Row 1: Ouvrage, Point de mesure, Paramètre, Finalité */}
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

          <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
            <SelectAutocomplete
              label="Finalité"
              placeholder={finalitesLoading ? 'Chargement…' : 'Toutes les finalités'}
              options={finalitesOptions}
              value={form.finalite || null}
              onChange={(v) => updateForm('finalite', v ?? '')}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-3')}>
            <SelectAutocomplete
              label="Statut"
              placeholder={statutsLoading ? 'Chargement…' : 'Indifférent'}
              options={statutsOptions}
              value={form.statut || null}
              onChange={(v) => updateForm('statut', v ?? '')}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-3')}>
            <SelectAutocomplete
              label="Qualification"
              placeholder={qualificationsLoading ? 'Chargement…' : 'Indifférent'}
              options={qualificationsOptions}
              value={form.qualification || null}
              onChange={(v) => updateForm('qualification', v ?? '')}
            />
          </div>
        </div>

        {/* Row 2: Date début, Date fin, Rechercher */}
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-grid-row--bottom', 'fr-mt-2w')}>
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
