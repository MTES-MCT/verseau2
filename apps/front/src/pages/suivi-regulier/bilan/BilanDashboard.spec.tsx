import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import type { BilanSclDto, BilanSteuDto } from '@lib/dossier';
import { CURRENT_BILAN_YEAR } from '@lib/dossier';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BilanDashboard } from './BilanDashboard';
import { BILAN_UNAVAILABLE_MESSAGE } from '../../../hooks/useBilanDashboard';
import * as bilanApi from '../../../api/bilan';
import * as mesuresApi from '../../../api/mesures';
import * as referentielApi from '../../../api/referentiel';

vi.mock('../../../api/bilan', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/bilan')>();
  return {
    ...actual,
    fetchBilanSteu: vi.fn(),
    fetchBilanScl: vi.fn(),
    fetchBilanSteuDetail: vi.fn(),
    fetchBilanSclDetail: vi.fn(),
    downloadBilanSteuExport: vi.fn(),
    downloadBilanSclExport: vi.fn(),
  };
});

vi.mock('../../../api/mesures', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/mesures')>();
  return {
    ...actual,
    fetchPointsMesure: vi.fn(),
    searchOuvrages: vi.fn(),
    searchSystemesCollecte: vi.fn(),
  };
});

vi.mock('../../../api/referentiel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/referentiel')>();
  return { ...actual, fetchParametresReferentiel: vi.fn() };
});

const mockFetchBilanSteu = vi.mocked(bilanApi.fetchBilanSteu);
const mockFetchBilanScl = vi.mocked(bilanApi.fetchBilanScl);
const mockFetchSteuDetail = vi.mocked(bilanApi.fetchBilanSteuDetail);
const mockFetchSclDetail = vi.mocked(bilanApi.fetchBilanSclDetail);
const mockDownloadSteu = vi.mocked(bilanApi.downloadBilanSteuExport);
const mockDownloadScl = vi.mocked(bilanApi.downloadBilanSclExport);
const mockFetchPointsMesure = vi.mocked(mesuresApi.fetchPointsMesure);
const mockSearchOuvrages = vi.mocked(mesuresApi.searchOuvrages);
const mockSearchSystemesCollecte = vi.mocked(mesuresApi.searchSystemesCollecte);
const mockFetchParametres = vi.mocked(referentielApi.fetchParametresReferentiel);

const YEAR = CURRENT_BILAN_YEAR;

const steuDetail001 = {
  ouvrageDepollutionCode: 'STEU001',
  ouvrageDepollutionNom: 'Station Alpha',
  dateMiseEnService: '2000-01-01',
  exploitants: [{ intervenantNom: 'Exploitant Alpha', intervenantSiret: '12345678901234' }],
  maitresOuvrage: [{ intervenantNom: 'MOA Alpha', intervenantSiret: '43210987654321' }],
};

const sclDetail001 = {
  systemeCollecteCode: 'SCL001',
  systemeCollecteNom: 'Collecteur Beta',
  exploitants: [{ intervenantNom: 'Exploitant Beta', intervenantSiret: '11111111111111' }],
  maitresOuvrage: [{ intervenantNom: 'MOA Beta', intervenantSiret: '22222222222222' }],
};

const pmo7 = {
  pointMesureId: 7,
  pointMesureNumero: 'PM7',
  pointMesureLibelle: 'Point 7',
  pointMesureLocalisationGlobale: 'A3',
};

const makeSteuRow = (overrides: Partial<BilanSteuDto> = {}): BilanSteuDto => ({
  steuCdn: 101,
  ouvrageDepollutionCode: 'STEU001',
  bilanEcarteParSpe: false,
  date: `${YEAR}-01-15`,
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
  pointMesureId: 7,
  pointMesureNumero: 'PM7',
  pointMesureLibelle: 'Point 7',
  date: `${YEAR}-02-20`,
  volumeDeverse: 100.5,
  tempsDeversement: 2.5,
  statut: 'TP',
  ...overrides,
});

let testNavigate: ((to: string | number) => void) | null = null;

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    testNavigate = (to) => {
      if (typeof to === 'number') {
        void navigate(to);
      } else {
        void navigate(to);
      }
    };
    return () => {
      testNavigate = null;
    };
  }, [navigate]);
  return <div data-testid="test-location">{`${location.pathname}${location.search}${location.hash}`}</div>;
}

const locationText = () => screen.getByTestId('test-location').textContent ?? '';

function renderAt(initialEntries: string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <BilanDashboard />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const navigateTo = (to: string) => {
  if (!testNavigate) {
    throw new Error('router not ready');
  }
  testNavigate(to);
};

const goBack = () => {
  if (!testNavigate) {
    throw new Error('router not ready');
  }
  testNavigate(-1);
};

const goForward = () => {
  if (!testNavigate) {
    throw new Error('router not ready');
  }
  testNavigate(1);
};

describe('BilanDashboard URL integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testNavigate = null;

    mockFetchParametres.mockResolvedValue([{ parametreAnalyseCode: '1313', parametreNomCourt: 'DBO5' }]);
    mockSearchOuvrages.mockResolvedValue([]);
    mockSearchSystemesCollecte.mockResolvedValue([]);
    mockFetchPointsMesure.mockImplementation(async (_type, code) => (code === 'SCL001' ? [pmo7] : []));
    mockFetchSteuDetail.mockImplementation(async (code) => (code === 'STEU001' ? steuDetail001 : null));
    mockFetchSclDetail.mockImplementation(async (code) => (code === 'SCL001' ? sclDetail001 : null));
    mockFetchBilanSteu.mockImplementation(async (query) =>
      query.ouvrageDepollutionCode === 'STEU001'
        ? { data: [makeSteuRow()], total: 1, page: query.page, pageSize: 20 }
        : { data: [], total: 0, page: query.page, pageSize: 20 },
    );
    mockFetchBilanScl.mockImplementation(async (query) =>
      query.systemeCollecteCode === 'SCL001'
        ? { data: [makeSclRow()], total: 1, page: query.page ?? 1, pageSize: 20 }
        : { data: [], total: 0, page: query.page ?? 1, pageSize: 20 },
    );
    mockDownloadSteu.mockResolvedValue({ blob: new Blob(['csv']), filename: 'bilan.csv' });
    mockDownloadScl.mockResolvedValue({ blob: new Blob(['csv']), filename: 'bilan.csv' });
  });

  it('restores a direct STEU link: controls, label from detail, and data', async () => {
    renderAt([`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=STEU001`]);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /station/i })).toHaveValue('Station Alpha');
    });
    expect(await screen.findByText('DBO5')).toBeInTheDocument();
    expect(screen.getByText('01/01/2000')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetchBilanSteu).toHaveBeenCalledWith(
        expect.objectContaining({ ouvrageDepollutionCode: 'STEU001', year: YEAR, page: 1, pageSize: 20 }),
      );
    });
  });

  it('retains a complete valid SCL URL: point, statut, page and sorting', async () => {
    mockFetchBilanScl.mockResolvedValue({ data: [makeSclRow()], total: 45, page: 2, pageSize: 20 });
    renderAt([
      `/suivi-regulier/bilan?mode=scl&year=${YEAR}&systemeCollecteCode=SCL001&pointMesureId=7&statut=TP&page=2&sortBy=date&sortOrder=DESC`,
    ]);

    expect(await screen.findByText('Collecteur Beta')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /système de collecte/i })).toHaveValue('Collecteur Beta');
    expect(screen.getByRole('combobox', { name: /point de mesures/i })).toHaveValue('A3 - PM7 - Point 7');
    expect(screen.getByLabelText(/statut/i)).toHaveValue('TP');

    await waitFor(() => {
      expect(mockFetchBilanScl).toHaveBeenCalledWith(
        expect.objectContaining({
          systemeCollecteCode: 'SCL001',
          pointMesureId: 7,
          statut: 'TP',
          page: 2,
          sortBy: 'date',
          sortOrder: 'DESC',
        }),
      );
    });
    expect(locationText()).toContain('pointMesureId=7');
    expect(locationText()).toContain('page=2');
  });

  it('restores controls and data on Back/Forward navigation', async () => {
    renderAt(['/suivi-regulier/bilan']);

    expect(screen.getByText(/sélectionner un ouvrage/i)).toBeInTheDocument();
    expect(mockFetchBilanSteu).not.toHaveBeenCalled();

    navigateTo(`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=STEU001`);
    expect(await screen.findByText('DBO5')).toBeInTheDocument();

    goBack();
    await waitFor(() => {
      expect(screen.getByText(/sélectionner un ouvrage/i)).toBeInTheDocument();
    });

    goForward();
    expect(await screen.findByText('DBO5')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /station/i })).toHaveValue('Station Alpha');
  });

  it('resets pagination to page 1 when sorting changes', async () => {
    mockFetchBilanSteu.mockResolvedValue({ data: [makeSteuRow()], total: 45, page: 3, pageSize: 20 });
    renderAt([`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=STEU001&page=3`]);

    expect(await screen.findByText('DBO5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^date$/i }));

    await waitFor(() => {
      expect(mockFetchBilanSteu).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, sortBy: 'date', sortOrder: 'ASC' }),
      );
    });
    expect(locationText()).toContain('sortBy=date');
    expect(locationText()).not.toContain('page=');
  });

  it('exposes pagination as real filtered URLs and follows Back/Forward', async () => {
    mockFetchBilanSteu.mockImplementation(async (query) => ({
      data: [makeSteuRow()],
      total: 45,
      page: query.page,
      pageSize: 20,
    }));
    renderAt([`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=STEU001`]);

    expect(await screen.findByText('DBO5')).toBeInTheDocument();

    const pagination = document.querySelector('.fr-pagination');
    expect(pagination).not.toBeNull();
    const page2Link = within(pagination as HTMLElement)
      .getAllByRole('link')
      .find((link) => link.textContent === '2');
    expect(page2Link).toBeDefined();
    expect(page2Link?.getAttribute('href')).toContain('ouvrageDepollutionCode=STEU001');
    expect(page2Link?.getAttribute('href')).toContain('page=2');

    fireEvent.click(page2Link as HTMLElement);
    await waitFor(() => {
      expect(locationText()).toContain('page=2');
      expect(mockFetchBilanSteu).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    });

    goBack();
    await waitFor(() => {
      expect(locationText()).not.toContain('page=');
      expect(mockFetchBilanSteu).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
    });
  });

  it('replaces a page beyond the last page, or page 1 for empty results', async () => {
    mockFetchBilanSteu.mockResolvedValue({ data: [], total: 45, page: 9, pageSize: 20 });
    renderAt([`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=STEU001&page=9`]);

    await waitFor(() => {
      expect(locationText()).toContain('page=3');
      expect(locationText()).not.toContain('page=9');
    });
  });

  it('uses the same validated query for the table and the CSV export', async () => {
    renderAt([`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=STEU001&parametreCode=1313`]);

    expect(await screen.findByText('DBO5')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /exporter csv/i }));

    await waitFor(() => {
      expect(mockDownloadSteu).toHaveBeenCalledTimes(1);
    });
    const tableQuery = mockFetchBilanSteu.mock.calls[mockFetchBilanSteu.mock.calls.length - 1][0] as Record<
      string,
      unknown
    >;
    const exportQuery = mockDownloadSteu.mock.calls[0][0] as Record<string, unknown>;
    for (const key of ['year', 'ouvrageDepollutionCode', 'parametreCode', 'sortBy', 'sortOrder'] as const) {
      expect(exportQuery[key]).toEqual(tableQuery[key]);
    }
  });

  it('shows the same unavailable message for unknown STEU and blocks results/export', async () => {
    renderAt([`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=UNKNOWN`]);

    expect(await screen.findByText(BILAN_UNAVAILABLE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /station/i })).toHaveValue('UNKNOWN');
    expect(mockFetchBilanSteu).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /exporter csv/i })).toBeDisabled();
    expect(locationText()).toContain('ouvrageDepollutionCode=UNKNOWN');
  });

  it('shows the same unavailable message for unknown SCL', async () => {
    renderAt([`/suivi-regulier/bilan?mode=scl&year=${YEAR}&systemeCollecteCode=UNKNOWN`]);

    expect(await screen.findByText(BILAN_UNAVAILABLE_MESSAGE)).toBeInTheDocument();
    expect(mockFetchBilanScl).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /exporter csv/i })).toBeDisabled();
  });

  it('blocks bilan requests when the point does not belong to the SCL', async () => {
    renderAt([`/suivi-regulier/bilan?mode=scl&year=${YEAR}&systemeCollecteCode=SCL001&pointMesureId=99`]);

    expect(await screen.findByText(BILAN_UNAVAILABLE_MESSAGE)).toBeInTheDocument();
    expect(mockFetchBilanScl).not.toHaveBeenCalled();
  });

  it('treats detail network failures as retryable errors, not as absence', async () => {
    mockFetchSteuDetail.mockRejectedValueOnce(new Error('network down'));
    mockFetchSteuDetail.mockImplementation(async (code) => (code === 'STEU001' ? steuDetail001 : null));
    renderAt([`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=STEU001`]);

    expect(await screen.findByRole('button', { name: /réessayer/i })).toBeInTheDocument();
    expect(screen.queryByText(BILAN_UNAVAILABLE_MESSAGE)).not.toBeInTheDocument();
    expect(mockFetchBilanSteu).not.toHaveBeenCalled();
    expect(locationText()).toContain('ouvrageDepollutionCode=STEU001');

    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }));
    expect(await screen.findByText('DBO5')).toBeInTheDocument();
    expect(mockFetchSteuDetail).toHaveBeenCalledTimes(2);
  });

  it('blocks on invalid filter values, keeps them in the URL, and resumes once corrected', async () => {
    renderAt([`/suivi-regulier/bilan?mode=scl&year=${YEAR}&systemeCollecteCode=SCL001&statut=XX`]);

    expect(screen.getByLabelText(/statut/i)).toHaveAccessibleDescription(/statut.*invalide|« XX »/i);
    expect(mockFetchBilanScl).not.toHaveBeenCalled();
    expect(locationText()).toContain('statut=XX');

    fireEvent.change(screen.getByLabelText(/statut/i), { target: { value: 'TP' } });

    await waitFor(() => {
      expect(mockFetchBilanScl).toHaveBeenCalledWith(expect.objectContaining({ statut: 'TP' }));
    });
    expect(locationText()).toContain('statut=TP');
    expect(locationText()).not.toContain('statut=XX');
  });

  it('requires choosing a supported year when the requested year is unavailable', async () => {
    renderAt([`/suivi-regulier/bilan?year=1999&ouvrageDepollutionCode=STEU001`]);

    expect(screen.getByLabelText(/année/i)).toHaveAccessibleDescription(/1999.*pas disponible/i);
    expect(mockFetchBilanSteu).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/année/i), { target: { value: String(YEAR) } });

    await waitFor(() => {
      expect(mockFetchBilanSteu).toHaveBeenCalledWith(expect.objectContaining({ year: YEAR }));
    });
  });

  it('restores default pagination with a warning on invalid page syntax', async () => {
    renderAt([`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=STEU001&page=abc`]);

    expect(await screen.findByText(/page.*invalide/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(locationText()).not.toContain('page=abc');
    });
    expect(await screen.findByText('DBO5')).toBeInTheDocument();
  });

  it('clears obsolete autocomplete draft state on external navigation without extra writes', async () => {
    renderAt([`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=STEU001`]);
    expect(await screen.findByText('DBO5')).toBeInTheDocument();

    const stationBox = screen.getByRole('combobox', { name: /station/i });
    fireEvent.click(stationBox);
    fireEvent.change(stationBox, { target: { value: 'ZZ' } });
    expect(await screen.findByRole('listbox')).toBeInTheDocument();

    navigateTo(`/suivi-regulier/bilan?mode=scl&year=${YEAR}&systemeCollecteCode=SCL001`);
    expect(await screen.findByText('Collecteur Beta')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(locationText()).toBe(`/suivi-regulier/bilan?mode=scl&year=${YEAR}&systemeCollecteCode=SCL001`);
  });

  it('never displays obsolete results on rapid navigation', async () => {
    let resolveSlow!: (value: typeof steuDetail001 | null) => void;
    const slowGate = new Promise<typeof steuDetail001 | null>((resolve) => {
      resolveSlow = resolve;
    });
    mockFetchSteuDetail.mockImplementation(async (code) => {
      if (code === 'SLOW001') {
        return slowGate;
      }
      return steuDetail001;
    });
    mockFetchBilanSteu.mockImplementation(async (query) => ({
      data: [makeSteuRow({ ouvrageDepollutionCode: query.ouvrageDepollutionCode ?? 'STEU001' })],
      total: 1,
      page: query.page,
      pageSize: 20,
    }));

    renderAt([`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=SLOW001`]);
    navigateTo(`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=STEU001`);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /station/i })).toHaveValue('Station Alpha');
    });

    resolveSlow({ ...steuDetail001, ouvrageDepollutionCode: 'SLOW001', ouvrageDepollutionNom: 'Station Lente' });
    await waitFor(() => {
      expect(mockFetchBilanSteu).toHaveBeenLastCalledWith(
        expect.objectContaining({ ouvrageDepollutionCode: 'STEU001' }),
      );
    });
    expect(screen.getByRole('combobox', { name: /station/i })).toHaveValue('Station Alpha');
    expect(screen.queryByText('Station Lente')).not.toBeInTheDocument();
  });

  it('only offers the current and previous year', () => {
    renderAt([`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=STEU001`]);

    expect(screen.getByRole('option', { name: String(YEAR) })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: String(YEAR - 1) })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: String(YEAR - 2) })).not.toBeInTheDocument();
  });

  it('shows the parametre filter in STEU mode only', async () => {
    const { unmount } = renderAt([`/suivi-regulier/bilan?year=${YEAR}&ouvrageDepollutionCode=STEU001`]);
    expect(await screen.findByLabelText(/paramètre/i)).toBeInTheDocument();
    unmount();

    renderAt([`/suivi-regulier/bilan?mode=scl&year=${YEAR}&systemeCollecteCode=SCL001`]);
    expect(await screen.findByText('Collecteur Beta')).toBeInTheDocument();
    expect(screen.queryByLabelText(/paramètre/i)).not.toBeInTheDocument();
  });
});
