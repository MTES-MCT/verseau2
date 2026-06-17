import { useState, useCallback, useEffect } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { SelectAutocomplete } from '../components/SelectAutocomplete';
import type { AutocompleteOption } from '../components/SelectAutocomplete';
import type { PointMesureReferentiel } from '@lib/dossier';
import { useReferentielFilters } from '../hooks/useReferentielFilters';
import Notice from '@codegouvfr/react-dsfr/Notice';
import { getPreviousSunday } from '@lib/shared';
import { FixedHeightTable } from '../components/common/FixedHeightTable';

const clipboardFallbackModal = createModal({ id: 'clipboard-fallback-modal', isOpenedByDefault: false });

function buildSignalerText(point: PointMesureReferentiel): string {
  return [
    'Bonjour,',
    '',
    'Je souhaite signaler une incohérence concernant le point de mesure suivant :',
    '',
    `- Ouvrage : ${point.ouvrageCode}${point.ouvrageNom ? ` / ${point.ouvrageNom}` : ''}`,
    `- Numéro de point : ${point.pointMesureNumero ?? 'non renseigné'}`,
    `- Nom du point : ${point.pointMesureLibelle ?? 'non renseigné'}`,
    `- Localisation : ${point.pointMesureLocalisationCode ?? 'non renseignée'}${point.pointMesureLocalisationLibelle ? ` / ${point.pointMesureLocalisationLibelle}` : ''}`,
    `- Date de début de validité : ${point.pointMesureValiditeDebutDate ?? 'non renseignée'}`,
    `- Date de fin de validité : ${point.pointMesureValiditeFinDate ?? 'non renseignée'}`,
    '',
    "Description de l'incohérence : [à compléter par l'utilisateur]",
    '',
    'Cordialement',
  ].join('\n');
}

function SignalerButton({
  point,
  onClick,
  onFallback,
}: {
  point: PointMesureReferentiel;
  onClick: (success: boolean) => void;
  onFallback: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(() => {
    const text = buildSignalerText(point);

    if (!navigator.clipboard?.writeText) {
      onFallback(text);
      onClick(false);
      return;
    }

    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onClick(true);
      },
      () => {
        onFallback(text);
        onClick(false);
      },
    );
  }, [point, onClick, onFallback]);

  return (
    <Button
      priority="tertiary no outline"
      iconId={copied ? 'fr-icon-check-line' : 'fr-icon-clipboard-line'}
      size="small"
      title="Copier les informations du point de mesure"
      onClick={handleClick}
    >
      {copied ? 'Copié!' : 'Copier'}
    </Button>
  );
}

export function ReferentielPointsMesurePage() {
  const {
    form,
    updateForm,
    updateOuvrageType,
    toggleCheckbox,
    handleSearch,
    ouvrages,
    ouvragesLoading,
    ouvrageSearch,
    setOuvrageSearch,
    systemesCollecte,
    systemesCollecteLoading,
    ouvrageError,
    data,
    isLoading,
    isFetching,
    error,
  } = useReferentielFilters();
  const [isCopiedNoticeVisible, setIsCopiedNoticeVisible] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  useEffect(() => {
    if (fallbackText) {
      clipboardFallbackModal.open();
    }
  }, [fallbackText]);

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

  const headers = [
    'Ouvrage',
    'Id. agence',
    'N° point',
    'Nom point',
    'Code loc.',
    'Localisation globale',
    ...(isScl ? ['Catégorie'] : []),
    'Date début',
    'Date fin',
    '',
  ];

  const tableData = (data ?? []).map((point) => [
    point.ouvrageNom ? `${point.ouvrageCode} - ${point.ouvrageNom}` : point.ouvrageCode,
    point.pointAgenceEauNumero ?? '',
    point.pointMesureNumero ?? '',
    point.pointMesureLibelle ?? '',
    point.pointMesureLocalisationCode ?? '',
    point.pointMesureLocalisationLibelle ?? '',
    ...(isScl ? [point.pointMesureCategorieSystemeCollecte ?? ''] : []),
    point.pointMesureValiditeDebutDate ?? '',
    point.pointMesureValiditeFinDate ?? '',
    <SignalerButton
      key={`signaler-${point.ouvrageCode}-${point.pointMesureNumero}`}
      point={point}
      onClick={(success) => setIsCopiedNoticeVisible(success)}
      onFallback={setFallbackText}
    />,
  ]);

  return (
    <div className={fr.cx('fr-container', 'fr-py-2w')}>
      <Notice
        title="Les données ne sont pas en temps réel"
        description={` - Données mises à jour le ${getPreviousSunday()}`}
        severity="info"
        className={fr.cx('fr-mb-2w')}
      />

      {isCopiedNoticeVisible && (
        <Notice
          title="Signalement copié"
          description="- Les informations du point de mesure ont été copiées dans le presse-papiers."
          severity="info"
          className={fr.cx('fr-mb-2w')}
          isClosable
          onClose={() => setIsCopiedNoticeVisible(false)}
        />
      )}

      <clipboardFallbackModal.Component
        title="Presse-papiers indisponible"
        size="large"
        buttons={[{ children: 'Fermer' }]}
      >
        <p>
          Le presse-papiers n&apos;est pas disponible dans ce contexte. Copiez le texte ci-dessous manuellement&nbsp;:
        </p>
        <textarea
          readOnly
          rows={12}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
          value={fallbackText}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
      </clipboardFallbackModal.Component>

      <h1>Points de mesure</h1>

      {/* Filters */}
      <div className={fr.cx('fr-mb-4w')}>
        {/* Ouvrage type selection */}
        <div className={fr.cx('fr-mb-3w')}>
          <RadioButtons
            legend="Type d'ouvrage"
            name="ouvrageType"
            orientation="horizontal"
            hintText={<br />}
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

        {/* Row 1: Ouvrage + Checkboxes */}
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
          <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
            <SelectAutocomplete
              label={isScl ? 'Système de collecte' : 'Station'}
              hintText={
                isScl
                  ? undefined
                  : ouvrageSearch.trim().length < 2
                    ? 'Saisissez au moins 2 caractères'
                    : ouvragesLoading
                      ? 'Recherche en cours...'
                      : undefined
              }
              placeholder={
                ouvragesLoadingCurrent ? 'Chargement...' : isScl ? 'Tous les systèmes' : 'Rechercher une station'
              }
              options={ouvragesOptions}
              value={form.selectedOuvrageCode || null}
              onChange={(v) => updateForm('selectedOuvrageCode', v ?? '')}
              onInputChange={isScl ? undefined : setOuvrageSearch}
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
                  label: 'Réglementaire',
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
        <div>
          <FixedHeightTable
            caption="Référentiel des points de mesure"
            noCaption
            bordered
            headers={headers}
            data={tableData}
            isFetching={isFetching}
            pageSize={Math.max(tableData.length, 1)}
            rowHeight="two-lines"
            noScroll={false}
            className={fr.cx('fr-mb-1w')}
          />

          <div className={fr.cx('fr-mt-2w')}>
            <p className={fr.cx('fr-text--sm')}>
              {data.length === 0
                ? 'Aucun point de mesure trouvé.'
                : `${data.length} point${data.length > 1 ? 's' : ''} de mesure trouvé${data.length > 1 ? 's' : ''}.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
