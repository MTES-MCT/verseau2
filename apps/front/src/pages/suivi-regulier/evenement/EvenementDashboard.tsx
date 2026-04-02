import { useState, type ChangeEvent } from 'react';
import type { EvenementSteuDto, EvenementSclDto } from '@lib/dossier';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { Select } from '@codegouvfr/react-dsfr/Select';
import { Table } from '@codegouvfr/react-dsfr/Table';
import { useEvenementSteu, useEvenementScl, useEvenementTypes, useEvenementPmo } from '../../../hooks/useEvenement';
import { useEvenementFilters } from '../../../hooks/useEvenementFilters';
import { renderPrisEnCompteBadge, formatDate } from '../../../helper/evenementTableData';
import { SelectAutocomplete, type AutocompleteOption } from '../../../components/SelectAutocomplete';
import { useOuvrages } from '../../../hooks/useOuvrages';
import { useSystemesCollecte } from '../../../hooks/useSystemesCollecte';
import { getPreviousSunday } from '../../../../../../packages/shared/src/date.service';
import { fr } from '@codegouvfr/react-dsfr';

export const EvenementDashboard = () => {
  const { filters, updateFilter } = useEvenementFilters();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: types } = useEvenementTypes();
  const { data: pmos } = useEvenementPmo(filters.mode === 'scl');
  const { data: ouvrages = [], isLoading: ouvragesLoading } = useOuvrages();
  const { data: systemesCollecte = [], isLoading: systemesCollecteLoading } = useSystemesCollecte();

  const isScl = filters.mode === 'scl';

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

  const handleOuvrageChange = (value: string | null) => {
    const newVal = value ?? '';
    if (isScl) {
      updateFilter({ systemeCollecteCode: newVal, pointMesureIdentifiant: '' });
    } else {
      updateFilter({ ouvrageDepollutionCode: newVal });
    }
  };

  const { data: steuData } = useEvenementSteu({ ...filters, page, pageSize }, filters.mode === 'steu');
  const { data: sclData } = useEvenementScl({ ...filters, page, pageSize }, filters.mode === 'scl');

  const data = filters.mode === 'steu' ? steuData : sclData;

  const getTableData = (row: EvenementSteuDto | EvenementSclDto) => {
    const baseRow = [
      renderPrisEnCompteBadge(row.prisEnCompte),
      formatDate(row.date),
      `${row.typeEvenementCode}-${row.typeEvenementLibelle}`,
      row.finalite,
      row.commentaire,
    ];

    if (filters.mode === 'scl') {
      const sclRow = row as EvenementSclDto;
      return [...baseRow, `${sclRow.pointMesureNumero} - ${sclRow.pointMesureLibelle}`];
    }
    return baseRow;
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
        <div className="fr-col-12 fr-col-lg-4">
          <RadioButtons
            legend="Type d'ouvrage"
            orientation="horizontal"
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
        <div className="fr-col-12 fr-col-md-3">
          <Select
            label="Année"
            nativeSelectProps={{
              value: filters.year.toString(),
              onChange: (e: ChangeEvent<HTMLSelectElement>) => updateFilter({ year: parseInt(e.target.value) }),
            }}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </Select>
        </div>
        <div className="fr-col-12 fr-col-md-3">
          <SelectAutocomplete
            label={isScl ? 'Système de collecte' : 'Station'}
            placeholder={ouvragesLoadingCurrent ? 'Chargement...' : isScl ? 'Tous les systèmes' : 'Toutes les stations'}
            options={ouvragesOptions}
            value={currentOuvrageValue || null}
            onChange={handleOuvrageChange}
          />
        </div>
        <div className="fr-col-12 fr-col-md-3">
          <Select
            label="Type d'événement"
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
          <div className="fr-col-12 fr-col-md-3">
            <Select
              label="Point de mesures"
              nativeSelectProps={{
                value: filters.pointMesureIdentifiant,
                onChange: (e: ChangeEvent<HTMLSelectElement>) =>
                  updateFilter({ pointMesureIdentifiant: e.target.value }),
              }}
            >
              <option value="">Tous les points</option>
              {(pmos || []).map((p) => (
                <option key={p.pointMesureIdentifiant} value={p.pointMesureIdentifiant.toString()}>
                  {p.pointMesureNumero} - {p.pointMesureLibelle}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <Table
        data={(data?.data || []).map(getTableData)}
        headers={[
          'Pris en compte',
          'Date',
          "Type d'événement",
          'Finalité',
          'Commentaire',
          ...(filters.mode === 'scl' ? ['Point de mesures'] : []),
        ]}
      />
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
    </div>
  );
};
