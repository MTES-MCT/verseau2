import { useState } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Input } from '@codegouvfr/react-dsfr/Input';
import type { MesureDto } from '@lib/dossier';
import { useMesures } from '../hooks/useMesures';
import { useOuvrages } from '../hooks/useOuvrages';

const PAGE_SIZE = 20;

function formatDate(date: Date | string | null): string {
  if (!date) {
    return '-';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function QualificationBadge({ qualification }: { qualification: string | null }) {
  if (!qualification) {
    return <>-</>;
  }
  const lower = qualification.toLowerCase();
  if (lower.includes('qualif')) {
    return (
      <Badge severity="success" small>
        {qualification}
      </Badge>
    );
  }
  return (
    <Badge severity="info" small>
      {qualification}
    </Badge>
  );
}

function buildPointDeMesure(mesure: MesureDto): string {
  const parts: string[] = [];
  if (mesure.nomPoint) {
    parts.push(mesure.nomPoint);
  }
  if (mesure.numPoint) {
    parts.push(`n°${mesure.numPoint}`);
  }
  if (mesure.numPointAgence) {
    parts.push(`(${mesure.numPointAgence})`);
  }
  return parts.join(' ') || '-';
}

export function DepotDetailsPage() {
  const [selectedSteu, setSelectedSteu] = useState<string>('');
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [parametreCode, setParametreCode] = useState<string>('');
  const [qualification, setQualification] = useState<string>('');
  const [finalite, setFinalite] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const { data: ouvrages = [], isLoading: ouvragesLoading } = useOuvrages();

  const query = {
    ...(selectedSteu ? { steuSandreCdas: [selectedSteu] } : {}),
    ...(dateDebut ? { dateDebut } : {}),
    ...(dateFin ? { dateFin } : {}),
    ...(parametreCode ? { parametreCode } : {}),
    ...(qualification ? { qualification } : {}),
    ...(finalite ? { finalite } : {}),
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading, error } = useMesures(query);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  function handleFilterChange() {
    setPage(1);
  }

  const tableData =
    data?.data.map((mesure) => [
      formatDate(mesure.date),
      buildPointDeMesure(mesure),
      mesure.localisationPoint ?? '-',
      mesure.parametreNom ?? mesure.parametreCode,
      mesure.valeur !== null && mesure.valeur !== undefined ? String(mesure.valeur) : '-',
      mesure.unite ?? '-',
      <QualificationBadge key="qual" qualification={mesure.qualification} />,
      mesure.finalite ?? '-',
      mesure.statut ?? '-',
    ]) ?? [];

  return (
    <div className={fr.cx('fr-container', 'fr-py-6w')}>
      <h1>Détail des mesures déposées</h1>

      <p className={fr.cx('fr-text--sm', 'fr-mb-4w')} style={{ color: 'var(--text-mention-grey)' }}>
        Données mises à jour chaque semaine (J-7)
      </p>

      {/* Filters */}
      <div className={fr.cx('fr-mb-4w')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
          <div className={fr.cx('fr-col-12', 'fr-col-md-4')}>
            <Select
              label="Ouvrage (STEU)"
              nativeSelectProps={{
                value: selectedSteu,
                onChange: (e) => {
                  setSelectedSteu(e.target.value);
                  handleFilterChange();
                },
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
                value: dateDebut,
                onChange: (e) => {
                  setDateDebut(e.target.value);
                  handleFilterChange();
                },
              }}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-2')}>
            <Input
              label="Date fin"
              nativeInputProps={{
                type: 'date',
                value: dateFin,
                onChange: (e) => {
                  setDateFin(e.target.value);
                  handleFilterChange();
                },
              }}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-2')}>
            <Input
              label="Paramètre"
              nativeInputProps={{
                type: 'text',
                value: parametreCode,
                placeholder: 'Code paramètre',
                onChange: (e) => {
                  setParametreCode(e.target.value);
                  handleFilterChange();
                },
              }}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-2')}>
            <Select
              label="Qualification"
              nativeSelectProps={{
                value: qualification,
                onChange: (e) => {
                  setQualification(e.target.value);
                  handleFilterChange();
                },
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
                value: finalite,
                placeholder: 'Finalité',
                onChange: (e) => {
                  setFinalite(e.target.value);
                  handleFilterChange();
                },
              }}
            />
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
