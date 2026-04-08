import { fireEvent, screen, waitFor } from '@testing-library/react';
import { CURRENT_BILAN_YEAR } from '@lib/dossier';
import type { BilanSclDto, BilanSteuDto } from '@lib/dossier';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithQueryClient } from '../../../test.helper';
import { useBilanScl, useBilanSteu } from '../../../hooks/useBilan';
import { BilanDashboard } from './BilanDashboard';
import { useOuvrages } from '../../../hooks/useOuvrages';
import { useSystemesCollecte } from '../../../hooks/useSystemesCollecte';
import { usePointsMesure } from '../../../hooks/usePointsMesure';

vi.mock('../../../hooks/useBilan', () => ({
  useBilanSteu: vi.fn(),
  useBilanScl: vi.fn(),
}));

vi.mock('../../../hooks/useOuvrages', () => ({
  useOuvrages: vi.fn(),
}));

vi.mock('../../../hooks/useSystemesCollecte', () => ({
  useSystemesCollecte: vi.fn(),
}));

vi.mock('../../../hooks/usePointsMesure', () => ({
  usePointsMesure: vi.fn(),
}));

const mockUseBilanSteu = vi.mocked(useBilanSteu);
const mockUseBilanScl = vi.mocked(useBilanScl);
const mockUseOuvrages = vi.mocked(useOuvrages);
const mockUseSystemesCollecte = vi.mocked(useSystemesCollecte);
const mockUsePointsMesure = vi.mocked(usePointsMesure);

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
  pointMesureIdentifiant: 1,
  pointMesureNumero: 'PM1',
  pointMesureLibelle: 'Point 1',
  date: '2024-01-01',
  volumeDeverse: 100.5,
  tempsDeversement: 2.5,
  statut: 'TP',
  ...overrides,
});

function renderPage() {
  return renderWithQueryClient(<BilanDashboard />);
}

describe('BilanDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseBilanSteu.mockReturnValue(
      emptySteuResult as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>,
    );
    mockUseBilanScl.mockReturnValue(
      emptySclResult as Partial<ReturnType<typeof useBilanScl>> as ReturnType<typeof useBilanScl>,
    );
    mockUseOuvrages.mockReturnValue({ data: [], isLoading: false } as Partial<
      ReturnType<typeof useOuvrages>
    > as ReturnType<typeof useOuvrages>);
    mockUseSystemesCollecte.mockReturnValue({ data: [], isLoading: false } as Partial<
      ReturnType<typeof useSystemesCollecte>
    > as ReturnType<typeof useSystemesCollecte>);
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
    expect(screen.getByRole('columnheader', { name: /^nom$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /bilan écarté par le spe/i })).toBeInTheDocument();
  });

  it('change les colonnes quand on bascule vers SCL', () => {
    mockUseBilanSteu.mockReturnValue({
      data: { data: [makeSteuRow()], total: 1, page: 1, pageSize: 10 },
    } as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>);
    mockUseBilanScl.mockReturnValue({
      data: { data: [makeSclRow()], total: 1, page: 1, pageSize: 10 },
    } as Partial<ReturnType<typeof useBilanScl>> as ReturnType<typeof useBilanScl>);

    renderPage();

    fireEvent.click(screen.getByRole('radio', { name: /scl/i }));

    expect(screen.getByRole('columnheader', { name: /point de mesure/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /volume déversé/i })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /bilan écarté par le spe/i })).not.toBeInTheDocument();
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
});
