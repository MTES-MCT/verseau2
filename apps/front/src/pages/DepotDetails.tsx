import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { SelectAutocomplete } from '../components/SelectAutocomplete';
import type { AutocompleteOption } from '../components/SelectAutocomplete';
import { useMesureFilters } from '../hooks/useMesureFilters';
import { buildMesureTableRows } from '../helper/mesureTableData';

export function DepotDetailsPage() {
  const {
    form,
    updateForm,
    updateSelectedPmo,
    handleSearch,
    ouvrages,
    ouvragesLoading,
    ouvrageError,
    pointsMesure,
    pointsMesureLoading,
    parametres,
    parametresLoading,
    finalites,
    finalitesLoading,
    data,
    isLoading,
    error,
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
  } = useMesureFilters();

  const ouvragesOptions: AutocompleteOption[] = ouvrages.map((o) => ({
    value: o.steuSandreCda,
    label: o.steuNom ?? o.steuSandreCda,
  }));

  const pointsMesureOptions: AutocompleteOption[] = pointsMesure.map((p) => ({
    value: String(p.pmoCdn),
    label: p.pmoLb ? `${p.pmoLb} (${p.pmoNo})` : p.pmoNo,
  }));

  const parametresOptions: AutocompleteOption[] = parametres.map((p) => ({
    value: p.parRfa,
    label: p.parCourtNomLb ? `${p.parCourtNomLb} (${p.parRfa})` : p.parRfa,
  }));

  const finalitesOptions: AutocompleteOption[] = finalites.map((f) => ({
    value: f.code,
    label: f.label ? `${f.label} (${f.code})` : f.code,
  }));

  const tableData = data ? buildMesureTableRows(data.data) : [];

  return (
    <div className={fr.cx('fr-container', 'fr-py-6w')}>
      <h1>Détail des mesures déposées</h1>

      <p className={fr.cx('fr-text--sm', 'fr-mb-4w')} style={{ color: 'var(--text-mention-grey)' }}>
        Données mises à jour chaque semaine (J-7)
      </p>

      {/* Filters */}
      <div className={fr.cx('fr-mb-4w')}>
        {/* Row 1: Ouvrage, Point de mesure, Paramètre */}
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
          <div className={fr.cx('fr-col-12', 'fr-col-md-3')}>
            <SelectAutocomplete
              label="Ouvrage (STEU)"
              placeholder={ouvragesLoading ? 'Chargement…' : 'Tous les ouvrages'}
              options={ouvragesOptions}
              value={form.selectedSteu || null}
              onChange={(v) => updateForm('selectedSteu', v ?? '')}
              state={ouvrageError ? 'error' : 'default'}
              stateRelatedMessage={ouvrageError || undefined}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-3')}>
            <SelectAutocomplete
              label="Point de mesure"
              placeholder={
                !form.selectedSteu ? 'Sélectionnez un ouvrage' : pointsMesureLoading ? 'Chargement…' : 'Tous les points'
              }
              options={pointsMesureOptions}
              value={form.selectedPmoCdn !== null ? String(form.selectedPmoCdn) : null}
              onChange={(v) => updateSelectedPmo(v ? Number(v) : null)}
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
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-3')}>
            <SelectAutocomplete
              label="Finalité"
              placeholder={finalitesLoading ? 'Chargement…' : 'Toutes les finalités'}
              options={finalitesOptions}
              value={form.finalite || null}
              onChange={(v) => updateForm('finalite', v ?? '')}
            />
          </div>
        </div>

        {/* Row 2: Date début, Date fin, Finalité, Rechercher */}
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

      {/* Loading */}
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

      {/* Table */}
      {!isLoading && !error && (
        <>
          <Table
            caption="Liste des mesures d'autosurveillance"
            noCaption
            bordered
            headers={[
              'Date',
              'Point de mesure',
              'Localisation',
              'Paramètre',
              'Valeur',
              'Unité',
              'Qualification',
              'Finalité',
              'Statut',
            ]}
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
      )}
    </div>
  );
}
