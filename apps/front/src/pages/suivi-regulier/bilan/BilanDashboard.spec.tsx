import { fireEvent, screen, waitFor } from '@testing-library/react';
import { CURRENT_BILAN_YEAR } from '@lib/dossier';
import type { BilanSclDto, BilanSteuDto } from '@lib/dossier';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithQueryClient } from '../../../test.helper';
import { useBilanScl, useBilanSteu } from '../../../hooks/useBilan';
import { BilanDashboard } from './BilanDashboard';
import { useAsyncOuvragesSearch } from '../../../hooks/useAsyncOuvragesSearch';
import { useAsyncSystemesCollecteSearch } from '../../../hooks/useAsyncSystemesCollecteSearch';
import { usePointsMesure } from '../../../hooks/usePointsMesure';
import { useBilanFilters } from '../../../hooks/useBilanFilters';

vi.mock('../../../hooks/useBilan', () => ({
  useBilanSteu: vi.fn(),
  useBilanScl: vi.fn(),
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

vi.mock('../../../hooks/useBilanFilters', () => ({
  useBilanFilters: vi.fn(),
}));

const mockUseBilanSteu = vi.mocked(useBilanSteu);
const mockUseBilanScl = vi.mocked(useBilanScl);
const mockUseAsyncOuvragesSearch = vi.mocked(useAsyncOuvragesSearch);
const mockUseAsyncSystemesCollecteSearch = vi.mocked(useAsyncSystemesCollecteSearch);
const mockUsePointsMesure = vi.mocked(usePointsMesure);
const mockUseBilanFilters = vi.mocked(useBilanFilters);

const emptySteuResult = {
  data: { data: [], total: 0, page: 1, pageSize: 10 },
  isLoading: false,
  isFetching: false,
  error: null,
};

const emptySclResult = {
  data: { data: [], total: 0, page: 1, pageSize: 10 },
  isLoading: false,
  isFetching: false,
  error: null,
};

const makeSteuRow = (overrides: Partial<BilanSteuDto> = {}): BilanSteuDto => ({
  steuCdn: 101,
  ouvrageDepollutionCode: 'STEU001',
  ouvrageDepollutionNom: 'Station Alpha',
  dateMiseEnService: '2000-01-01',
  exploitantNom: 'Exploitant Alpha',
  moaNom: 'MOA Alpha',
  exploitantSiret: '12345678901234',
  moaSiret: '43210987654321',
  bilanEcarteParSpe: false,
  date: '2024-01-01',
  parametreNom: 'DBO5',
  hcnf: 'Non',
  evt: 'Non',
  finalite: 'Autosurveillance',
  ...overrides,
});

const makeSclRow = (overrides: Partial<BilanSclDto> = {}): BilanSclDto => ({
  sclCdn: 202,
  systemeCollecteCode: 'SCL001',
  systemeCollecteNom: 'Collecteur Beta',
  pointMesureId: 1,
  pointMesureNumero: 'PM1',
  pointMesureLibelle: 'Point 1',
  date: '2024-01-01',
  volumeDeverse: 100.5,
  tempsDeversement: 2.5,
  statut: 'TP',
  ...overrides,
});

const mockUpdateFilter = vi.fn();
const mockSetPage = vi.fn();

function defaultFilters(overrides = {}) {
  return {
    filters: {
      mode: 'steu' as const,
      year: CURRENT_BILAN_YEAR,
      ouvrageDepollutionCode: 'STEU001',
      systemeCollecteCode: '',
      pointMesureId: '',
      statut: '' as const,
    },
    updateFilter: mockUpdateFilter,
    page: 1,
    setPage: mockSetPage,
    ...overrides,
  };
}

function renderPage() {
  return renderWithQueryClient(<BilanDashboard />);
}

describe('BilanDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseBilanFilters.mockReturnValue(defaultFilters());
    mockUseBilanSteu.mockReturnValue(
      emptySteuResult as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>,
    );
    mockUseBilanScl.mockReturnValue(
      emptySclResult as Partial<ReturnType<typeof useBilanScl>> as ReturnType<typeof useBilanScl>,
    );
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

  it('affiche le tableau STEU par défaut', () => {
    mockUseBilanSteu.mockReturnValue({
      data: { data: [makeSteuRow()], total: 1, page: 1, pageSize: 10 },
    } as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>);

    renderPage();

    expect(screen.getByRole('columnheader', { name: /code sandre/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /date de mise en service/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /exploitant \/ moa/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /siret établissement/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /bilan écarté par le spe/i })).toBeInTheDocument();
    expect(screen.getByText('Exploitant Alpha / MOA Alpha')).toBeInTheDocument();
    expect(screen.getByText('12345678901234 / 43210987654321')).toBeInTheDocument();
  });

  it('affiche une seule valeur quand exploitant et moa sont identiques', () => {
    mockUseBilanSteu.mockReturnValue({
      data: {
        data: [
          makeSteuRow({
            exploitantNom: 'Syndicat Alpha',
            moaNom: 'Syndicat Alpha',
            exploitantSiret: '11111111111111',
            moaSiret: '11111111111111',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
    } as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>);

    renderPage();

    expect(screen.getByText('Syndicat Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Syndicat Alpha / Syndicat Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('11111111111111')).toBeInTheDocument();
    expect(screen.queryByText('11111111111111 / 11111111111111')).not.toBeInTheDocument();
  });

  it('change les colonnes quand on bascule vers SCL', () => {
    mockUseBilanFilters.mockReturnValue(
      defaultFilters({
        filters: {
          mode: 'scl',
          year: CURRENT_BILAN_YEAR,
          ouvrageDepollutionCode: '',
          systemeCollecteCode: 'SCL001',
          pointMesureId: '',
          statut: '',
        },
      }),
    );
    mockUseBilanScl.mockReturnValue({
      data: { data: [makeSclRow()], total: 1, page: 1, pageSize: 10 },
    } as Partial<ReturnType<typeof useBilanScl>> as ReturnType<typeof useBilanScl>);

    renderPage();

    expect(screen.getByRole('columnheader', { name: /point de mesure/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /volume déversé/i })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /bilan écarté par le spe/i })).not.toBeInTheDocument();
  });

  it('désactive les filtres dépendants tant qu’aucun ouvrage SCL n’est sélectionné', () => {
    mockUseBilanFilters.mockReturnValue(
      defaultFilters({
        filters: {
          mode: 'scl',
          year: CURRENT_BILAN_YEAR,
          ouvrageDepollutionCode: '',
          systemeCollecteCode: '',
          pointMesureId: '',
          statut: '',
        },
      }),
    );

    renderPage();

    expect(screen.getByLabelText(/point de mesures/i)).toBeDisabled();
    expect(screen.getByLabelText(/statut/i)).toBeDisabled();
  });

  it('affiche uniquement N et N-1 dans le filtre année', async () => {
    mockUseBilanSteu.mockReturnValue({
      data: { data: [makeSteuRow()], total: 1, page: 1, pageSize: 10 },
    } as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>);

    renderPage();
    const yearSelect = screen.getByLabelText(/année/i);

    expect(screen.getByRole('option', { name: String(CURRENT_BILAN_YEAR) })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: String(CURRENT_BILAN_YEAR - 1) })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: String(CURRENT_BILAN_YEAR - 2) })).not.toBeInTheDocument();

    fireEvent.change(yearSelect, { target: { value: String(CURRENT_BILAN_YEAR) } });

    await waitFor(() => {
      expect(mockUseBilanSteu).toHaveBeenLastCalledWith(expect.objectContaining({ year: CURRENT_BILAN_YEAR }), true);
    });
  });

  it('affiche la pagination quand total dépasse la page', () => {
    mockUseBilanSteu.mockReturnValue({
      data: {
        data: Array.from({ length: 10 }, (_, index) =>
          makeSteuRow({ steuCdn: index + 1, ouvrageDepollutionCode: `STEU${index + 1}` }),
        ),
        total: 15,
        page: 1,
        pageSize: 10,
      },
    } as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>);

    renderPage();

    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });

  it('masque la pagination quand total tient sur une page', () => {
    mockUseBilanSteu.mockReturnValue({
      data: { data: [makeSteuRow()], total: 5, page: 1, pageSize: 10 },
    } as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>);

    renderPage();

    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });

  it('préfixe les options de point de mesure avec la localisation globale', () => {
    mockUseBilanFilters.mockReturnValue(
      defaultFilters({
        filters: {
          mode: 'scl',
          year: CURRENT_BILAN_YEAR,
          ouvrageDepollutionCode: '',
          systemeCollecteCode: 'SCL001',
          pointMesureId: '',
          statut: '',
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

    renderPage();

    fireEvent.click(screen.getByRole('combobox', { name: /point de mesures/i }));

    expect(screen.getByRole('option', { name: /a3 - 120 - do entrée station/i })).toBeInTheDocument();
  });
});
