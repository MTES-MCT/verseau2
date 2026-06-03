import { fireEvent, screen, within } from '@testing-library/react';
import { CURRENT_EVENEMENT_YEAR } from '@lib/dossier';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithQueryClient } from '../../../test.helper';
import { useEvenementScl, useEvenementSteu, useEvenementTypes } from '../../../hooks/useEvenement';
import { useAsyncOuvragesSearch } from '../../../hooks/useAsyncOuvragesSearch';
import { useAsyncSystemesCollecteSearch } from '../../../hooks/useAsyncSystemesCollecteSearch';
import { usePointsMesure } from '../../../hooks/usePointsMesure';
import { useEvenementFilters } from '../../../hooks/useEvenementFilters';
import { EvenementDashboard } from './EvenementDashboard';
import * as evenementApi from '../../../api/evenement';

vi.mock('../../../hooks/useEvenement', () => ({
  useEvenementSteu: vi.fn(),
  useEvenementScl: vi.fn(),
  useEvenementTypes: vi.fn(),
}));

vi.mock('../../../hooks/useAsyncOuvragesSearch', () => ({
  useAsyncOuvragesSearch: vi.fn(),
}));

vi.mock('../../../hooks/useAsyncSystemesCollecteSearch', () => ({
  useAsyncSystemesCollecteSearch: vi.fn(),
}));

vi.mock('../../../hooks/usePointsMesure', () => ({
  usePointsMesure: vi.fn(),
}));

vi.mock('../../../hooks/useEvenementFilters', () => ({
  useEvenementFilters: vi.fn(),
}));

vi.mock('../../../api/evenement', async () => {
  const actual = await vi.importActual<typeof import('../../../api/evenement')>('../../../api/evenement');
  return {
    ...actual,
    downloadEvenementSteuExport: vi.fn(),
    downloadEvenementSclExport: vi.fn(),
  };
});

const mockUseEvenementSteu = vi.mocked(useEvenementSteu);
const mockUseEvenementScl = vi.mocked(useEvenementScl);
const mockUseEvenementTypes = vi.mocked(useEvenementTypes);
const mockUseAsyncOuvragesSearch = vi.mocked(useAsyncOuvragesSearch);
const mockUseAsyncSystemesCollecteSearch = vi.mocked(useAsyncSystemesCollecteSearch);
const mockUsePointsMesure = vi.mocked(usePointsMesure);
const mockUseEvenementFilters = vi.mocked(useEvenementFilters);
const mockDownloadEvenementSteuExport = vi.mocked(evenementApi.downloadEvenementSteuExport);

const mockUpdateFilter = vi.fn();
const mockSetPage = vi.fn();

const emptyResult = {
  data: { data: [], total: 0, page: 1, pageSize: 10 },
  isLoading: false,
  isFetching: false,
  error: null,
};

function defaultFilters(overrides = {}) {
  return {
    filters: {
      mode: 'steu' as const,
      year: CURRENT_EVENEMENT_YEAR,
      typeEvenementCode: '',
      typePointMesure: 'tous' as const,
      pointMesureId: '',
      ouvrageDepollutionCode: 'STEU001',
      systemeCollecteCode: '',
    },
    updateFilter: mockUpdateFilter,
    page: 1,
    setPage: mockSetPage,
    ...overrides,
  };
}

describe('EvenementDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseEvenementFilters.mockReturnValue(defaultFilters());
    mockUseEvenementSteu.mockReturnValue(
      emptyResult as Partial<ReturnType<typeof useEvenementSteu>> as ReturnType<typeof useEvenementSteu>,
    );
    mockUseEvenementScl.mockReturnValue(
      emptyResult as Partial<ReturnType<typeof useEvenementScl>> as ReturnType<typeof useEvenementScl>,
    );
    mockUseEvenementTypes.mockReturnValue({ data: [], isLoading: false } as Partial<
      ReturnType<typeof useEvenementTypes>
    > as ReturnType<typeof useEvenementTypes>);
    mockUseAsyncOuvragesSearch.mockReturnValue({ data: [], isLoading: false } as Partial<
      ReturnType<typeof useAsyncOuvragesSearch>
    > as ReturnType<typeof useAsyncOuvragesSearch>);
    mockUseAsyncSystemesCollecteSearch.mockReturnValue({ data: [], isLoading: false } as Partial<
      ReturnType<typeof useAsyncSystemesCollecteSearch>
    > as ReturnType<typeof useAsyncSystemesCollecteSearch>);
    mockUsePointsMesure.mockReturnValue({ data: [], isLoading: false } as Partial<
      ReturnType<typeof usePointsMesure>
    > as ReturnType<typeof usePointsMesure>);
  });

  it('désactive les filtres à droite tant qu’aucun ouvrage SCL n’est sélectionné', () => {
    mockUseEvenementFilters.mockReturnValue(
      defaultFilters({
        filters: {
          mode: 'scl',
          year: CURRENT_EVENEMENT_YEAR,
          typeEvenementCode: '',
          typePointMesure: 'tous' as const,
          pointMesureId: '',
          ouvrageDepollutionCode: '',
          systemeCollecteCode: '',
        },
      }),
    );

    renderWithQueryClient(<EvenementDashboard />);

    expect(screen.getByLabelText(/type d'événement/i)).toBeDisabled();
    expect(screen.getByLabelText(/point de mesures/i)).toBeDisabled();
  });

  it('n’affiche pas les filtres avancés en mode STEU', () => {
    renderWithQueryClient(<EvenementDashboard />);

    expect(screen.queryByRole('region', { name: /filtres avancés/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/type de point/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/point de mesures/i)).not.toBeInTheDocument();
    expect(mockUsePointsMesure).toHaveBeenCalledWith('steu', null, 'tous');
  });

  it('n’envoie pas pointMesureId dans la requête STEU', () => {
    mockUseEvenementFilters.mockReturnValue(
      defaultFilters({
        filters: {
          mode: 'steu',
          year: CURRENT_EVENEMENT_YEAR,
          typeEvenementCode: '',
          typePointMesure: 'tous' as const,
          pointMesureId: '12',
          ouvrageDepollutionCode: 'STEU001',
          systemeCollecteCode: '',
        },
      }),
    );

    renderWithQueryClient(<EvenementDashboard />);

    const lastSteuQuery = mockUseEvenementSteu.mock.calls.at(-1)?.[0];
    expect(lastSteuQuery).toMatchObject({ year: CURRENT_EVENEMENT_YEAR, ouvrageDepollutionCode: 'STEU001' });
    expect(lastSteuQuery).not.toHaveProperty('pointMesureId');
  });

  it('affiche les filtres avancés en mode SCL', () => {
    mockUseEvenementFilters.mockReturnValue(
      defaultFilters({
        filters: {
          mode: 'scl',
          year: CURRENT_EVENEMENT_YEAR,
          typeEvenementCode: '',
          typePointMesure: 'tous' as const,
          pointMesureId: '',
          ouvrageDepollutionCode: '',
          systemeCollecteCode: 'SCL001',
        },
      }),
    );

    renderWithQueryClient(<EvenementDashboard />);

    const advancedFilters = screen.getByRole('region', { name: /filtres avancés/i });

    expect(within(advancedFilters).getByLabelText(/type de point/i)).toBeInTheDocument();
    expect(within(advancedFilters).getByLabelText(/point de mesures/i)).toBeInTheDocument();
  });

  it('affiche des libellés de type de point cohérents avec le filtrage backend', () => {
    mockUseEvenementFilters.mockReturnValue(
      defaultFilters({
        filters: {
          mode: 'scl',
          year: CURRENT_EVENEMENT_YEAR,
          typeEvenementCode: '',
          typePointMesure: 'tous' as const,
          pointMesureId: '',
          ouvrageDepollutionCode: '',
          systemeCollecteCode: 'SCL001',
        },
      }),
    );

    renderWithQueryClient(<EvenementDashboard />);

    const typePointSelect = screen.getByLabelText(/type de point/i);

    expect(within(typePointSelect).getByRole('option', { name: /réglementaire \(a\/m\)/i })).toBeInTheDocument();
    expect(within(typePointSelect).getByRole('option', { name: /logique \(r\/s\)/i })).toBeInTheDocument();
  });

  it('préfixe les options de point de mesure avec la localisation globale', () => {
    mockUseEvenementFilters.mockReturnValue(
      defaultFilters({
        filters: {
          mode: 'scl',
          year: CURRENT_EVENEMENT_YEAR,
          typeEvenementCode: '',
          typePointMesure: 'tous' as const,
          pointMesureId: '',
          ouvrageDepollutionCode: '',
          systemeCollecteCode: 'SCL001',
        },
      }),
    );
    mockUsePointsMesure.mockReturnValue({
      data: [
        {
          pointMesureId: 120,
          pointMesureNumero: '120',
          pointMesureLibelle: 'DO entrée station',
          pointMesureLocalisationGlobale: 'A3',
        },
      ],
      isLoading: false,
    } as Partial<ReturnType<typeof usePointsMesure>> as ReturnType<typeof usePointsMesure>);

    renderWithQueryClient(<EvenementDashboard />);

    fireEvent.click(screen.getByRole('combobox', { name: /point de mesures/i }));

    expect(screen.getByRole('option', { name: /a3 - 120 - do entrée station/i })).toBeInTheDocument();
  });

  it('exporte les événements avec les filtres affichés', async () => {
    mockDownloadEvenementSteuExport.mockResolvedValue({ blob: new Blob(['csv']), filename: 'evenement.csv' });
    mockUseEvenementSteu.mockReturnValue({
      data: {
        data: [
          {
            prisEnCompte: true,
            date: '2024-01-01',
            ouvrageDepollutionCode: 'STEU001',
            ouvrageDepollutionNom: 'Station',
            typeEvenementCode: '1',
            typeEvenementLibelle: 'Alerte',
            finalite: null,
            commentaire: null,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as Partial<ReturnType<typeof useEvenementSteu>> as ReturnType<typeof useEvenementSteu>);

    renderWithQueryClient(<EvenementDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /exporter csv/i }));

    expect(mockDownloadEvenementSteuExport).toHaveBeenCalledWith(
      expect.objectContaining({ year: CURRENT_EVENEMENT_YEAR, ouvrageDepollutionCode: 'STEU001' }),
    );
  });
});
