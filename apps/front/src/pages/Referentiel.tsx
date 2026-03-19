import { useState, useCallback } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { SelectAutocomplete } from '../components/SelectAutocomplete';
import type { AutocompleteOption } from '../components/SelectAutocomplete';
import type { PointMesureReferentiel } from '@lib/dossier';
import { useReferentielFilters } from '../hooks/useReferentielFilters';
import Notice from '@codegouvfr/react-dsfr/Notice';
import { getPreviousSunday } from '@lib/shared';

function buildSignalerText(point: PointMesureReferentiel): string {
  return [
    'Bonjour,',
    '',
    'Je souhaite signaler une incoh\u00e9rence concernant le point de mesure suivant :',
    '',
    `- Ouvrage : ${point.ouvrageSandreCda}${point.ouvrageNom ? ` \u2014 ${point.ouvrageNom}` : ''}`,
    `- Num\u00e9ro de point : ${point.numeroPoint ?? 'non renseign\u00e9'}`,
    `- Nom du point : ${point.nomPoint ?? 'non renseign\u00e9'}`,
    `- Localisation : ${point.localisationCode ?? 'non renseign\u00e9e'}${point.localisationGlobale ? ` \u2014 ${point.localisationGlobale}` : ''}`,
    `- Date de d\u00e9but de validit\u00e9 : ${point.dateDebut ?? 'non renseign\u00e9e'}`,
    `- Date de fin de validit\u00e9 : ${point.dateFin ?? 'non renseign\u00e9e'}`,
    '',
    'Description de l\u2019incoh\u00e9rence : [\u00e0 compl\u00e9ter par l\u2019utilisateur]',
    '',
    'Cordialement',
  ].join('\n');
}

function SignalerButton({ point }: { point: PointMesureReferentiel }) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(() => {
    void navigator.clipboard.writeText(buildSignalerText(point));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [point]);

  return (
    <Button
      priority="tertiary no outline"
      iconId={copied ? 'fr-icon-check-line' : 'fr-icon-clipboard-line'}
      size="small"
      title="Copier les informations du point de mesure"
      onClick={handleClick}
    >
      {copied ? 'Copi\u00e9 !' : 'Signaler'}
    </Button>
  );
}

export function ReferentielPage() {
  const {
    form,
    updateForm,
    updateOuvrageType,
    toggleCheckbox,
    handleSearch,
    ouvrages,
    ouvragesLoading,
    systemesCollecte,
    systemesCollecteLoading,
    ouvrageError,
    data,
    isLoading,
    isFetching,
    error,
  } = useReferentielFilters();

  const isScl = form.ouvrageType === 'scl';

  const ouvragesOptions: AutocompleteOption[] = isScl
    ? systemesCollecte.map((s) => ({
        value: s.sclSandreCda,
        label: s.sclNom ?? s.sclSandreCda,
      }))
    : ouvrages.map((o) => ({
        value: o.steuSandreCda,
        label: o.steuNom ?? o.steuSandreCda,
      }));

  const ouvragesLoadingCurrent = isScl ? systemesCollecteLoading : ouvragesLoading;

  const headers = [
    'Ouvrage',
    'Id. agence',
    'N\u00b0 point',
    'Nom point',
    'Code loc.',
    'Localisation globale',
    ...(isScl ? ['Cat\u00e9gorie'] : []),
    'Date d\u00e9but',
    'Date fin',
    '',
  ];

  const tableData = (data?.points ?? []).map((point) => [
    point.ouvrageNom ? `${point.ouvrageSandreCda} - ${point.ouvrageNom}` : point.ouvrageSandreCda,
    point.identifiantAgence ?? '',
    point.numeroPoint ?? '',
    point.nomPoint ?? '',
    point.localisationCode ?? '',
    point.localisationGlobale ?? '',
    ...(isScl ? [point.categorie ?? ''] : []),
    point.dateDebut ?? '',
    point.dateFin ?? '',
    <SignalerButton key={`signaler-${point.ouvrageSandreCda}-${point.numeroPoint}`} point={point} />,
  ]);

  return (
    <div className={fr.cx('fr-container', 'fr-py-2w')}>
      <Notice
        title="Les donn\u00e9es ne sont pas en temps r\u00e9el"
        description={` - Donn\u00e9es mises \u00e0 jour le ${getPreviousSunday()}`}
        severity="info"
        className={fr.cx('fr-mb-2w')}
      />
      <h1>R\u00e9f\u00e9rentiel \u2014 Points de mesure</h1>

      {/* Filters */}
      <div className={fr.cx('fr-mb-4w')}>
        {/* Ouvrage type selection */}
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
                label: 'Syst\u00e8me de collecte',
                nativeInputProps: {
                  value: 'scl',
                  checked: form.ouvrageType === 'scl',
                  onChange: () => updateOuvrageType('scl'),
                },
              },
            ]}
          />
        </div>

        {/* Row 1: Ouvrage + Checkboxes */}
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
          <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
            <SelectAutocomplete
              label={isScl ? 'Syst\u00e8me de collecte' : 'Station'}
              placeholder={
                ouvragesLoadingCurrent ? 'Chargement\u2026' : isScl ? 'Tous les syst\u00e8mes' : 'Tous les ouvrages'
              }
              options={ouvragesOptions}
              value={form.selectedOuvrageCode || null}
              onChange={(v) => updateForm('selectedOuvrageCode', v ?? '')}
              state={ouvrageError ? 'error' : 'default'}
              stateRelatedMessage={ouvrageError || undefined}
            />
          </div>

          <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
            <Checkbox
              legend="Type de points"
              orientation="horizontal"
              options={[
                {
                  label: 'R\u00e9glementaire',
                  nativeInputProps: {
                    checked: form.reglementaire,
                    onChange: () => toggleCheckbox('reglementaire'),
                  },
                },
                {
                  label: 'Logique',
                  nativeInputProps: {
                    checked: form.logique,
                    onChange: () => toggleCheckbox('logique'),
                  },
                },
              ]}
            />
          </div>
        </div>

        {/* Row 2: Date début, Date fin, Rechercher */}
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters', 'fr-grid-row--bottom', 'fr-mt-2w')}>
          <div className={fr.cx('fr-col-12', 'fr-col-md-2')}>
            <Input
              label="Date d\u00e9but"
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

      {/* Initial loading */}
      {isLoading && <p className={fr.cx('fr-text--sm')}>Chargement des points de mesure...</p>}

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          title="Erreur"
          description="Une erreur est survenue lors du chargement des points de mesure."
          className={fr.cx('fr-mb-4w')}
        />
      )}

      {/* Results table */}
      {!isLoading && !error && data && (
        <div style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
          <Table
            caption="R\u00e9f\u00e9rentiel des points de mesure"
            noCaption
            bordered
            headers={headers}
            data={tableData}
            noScroll={false}
            className={fr.cx('fr-mb-1w')}
          />

          <div className={fr.cx('fr-mt-2w')}>
            <p className={fr.cx('fr-text--sm')}>
              {data.points.length === 0
                ? 'Aucun point de mesure trouv\u00e9.'
                : `${data.points.length} point${data.points.length > 1 ? 's' : ''} de mesure trouv\u00e9${data.points.length > 1 ? 's' : ''}.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
