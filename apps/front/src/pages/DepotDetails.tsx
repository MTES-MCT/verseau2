import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { useMesureFilters } from '../hooks/useMesureFilters';
import { buildMesureTableRows } from '../helper/mesureTableData';

export function DepotDetailsPage() {
  const {
    form,
    updateForm,
    handleSearch,
    ouvrages,
    ouvragesLoading,
    data,
    isLoading,
    error,
    page,
    setPage,
    totalPages,
    PAGE_SIZE,
  } = useMesureFilters();

  const tableData = data ? buildMesureTableRows(data.data) : [];

  return (
    <div className={fr.cx('fr-container', 'fr-py-6w')}>
      <h1>Détail des mesures déposées</h1>

      <p className={fr.cx('fr-text--sm', 'fr-mb-4w')} style={{ color: 'var(--text-mention-grey)' }}>
        Données mises à jour chaque semaine (J-7)
      </p>

      {/* Filters */}
      <div className={fr.cx('fr-mb-4w')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-grid-row--bottom')}>
          <div className={fr.cx('fr-col-12', 'fr-col-md-4')}>
            <Select
              label="Ouvrage (STEU)"
              nativeSelectProps={{
                value: form.selectedSteu,
                onChange: (e) => updateForm('selectedSteu', e.target.value),
                disabled: ouvragesLoading,
              }}
            >
              <option value="">Tous les ouvrages</option>
              {ouvrages.map((o) => (
                <option key={o.steuSandreCda} value={o.steuSandreCda}>
                  {o.steuNom ?? o.steuSandreCda}
                </option>
              ))}
            </Select>
          </div>

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

          <div className={fr.cx('fr-col-12', 'fr-col-md-2')}>
            <Input
              label="Paramètre"
              nativeInputProps={{
                type: 'text',
                value: form.parametreCode,
                placeholder: 'Code paramètre',
                onChange: (e) => updateForm('parametreCode', e.target.value),
              }}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-2')}>
            <Select
              label="Qualification"
              nativeSelectProps={{
                value: form.qualification,
                onChange: (e) => updateForm('qualification', e.target.value),
              }}
            >
              <option value="">Toutes</option>
              <option value="Brut">Brut</option>
              <option value="Qualifié">Qualifié</option>
            </Select>
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-2')}>
            <Input
              label="Finalité"
              nativeInputProps={{
                type: 'text',
                value: form.finalite,
                placeholder: 'Finalité',
                onChange: (e) => updateForm('finalite', e.target.value),
              }}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-2')}>
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
