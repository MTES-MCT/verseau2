import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ALLOWED_BILAN_STEU_PARAMETRE_CODES, CURRENT_BILAN_YEAR } from '@lib/dossier';
import type { BilanSclDto, BilanSteuDto } from '@lib/dossier';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { renderWithQueryClient } from '../../../test.helper';
import {
  useBilanScl,
  useBilanSclDetail,
  useBilanSteu,
  useBilanSteuDetail,
  useBilanSteuParametres,
} from '../../../hooks/useBilan';
import { BilanDashboard } from './BilanDashboard';
import { useAsyncOuvragesSearch } from '../../../hooks/useAsyncOuvragesSearch';
import { useAsyncSystemesCollecteSearch } from '../../../hooks/useAsyncSystemesCollecteSearch';
import { usePointsMesure } from '../../../hooks/usePointsMesure';
import { useBilanFilters } from '../../../hooks/useBilanFilters';
import * as bilanApi from '../../../api/bilan';

vi.mock('../../../hooks/useBilan', () => ({
  useBilanSteu: vi.fn(),
  useBilanScl: vi.fn(),
  useBilanSteuDetail: vi.fn(),
  useBilanSclDetail: vi.fn(),
  useBilanSteuParametres: vi.fn(),
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

vi.mock('../../../api/bilan', async () => {
  const actual = await vi.importActual<typeof import('../../../api/bilan')>('../../../api/bilan');
  return {
    ...actual,
    downloadBilanSteuExport: vi.fn(),
    downloadBilanSclExport: vi.fn(),
  };
});

const mockUseBilanSteu = vi.mocked(useBilanSteu);
const mockUseBilanScl = vi.mocked(useBilanScl);
const mockUseBilanSteuDetail = vi.mocked(useBilanSteuDetail);
const mockUseBilanSclDetail = vi.mocked(useBilanSclDetail);
const mockUseAsyncOuvragesSearch = vi.mocked(useAsyncOuvragesSearch);
const mockUseAsyncSystemesCollecteSearch = vi.mocked(useAsyncSystemesCollecteSearch);
const mockUsePointsMesure = vi.mocked(usePointsMesure);
const mockUseBilanFilters = vi.mocked(useBilanFilters);
const mockDownloadBilanSteuExport = vi.mocked(bilanApi.downloadBilanSteuExport);
const mockUseBilanSteuParametres = vi.mocked(useBilanSteuParametres);

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

const emptyDetailResult = {
  data: undefined,
  isLoading: false,
  isFetching: false,
  error: null,
};

const makeSteuRow = (overrides: Partial<BilanSteuDto> = {}): BilanSteuDto => ({
  steuCdn: 101,
  ouvrageDepollutionCode: 'STEU001',
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
      parametreCode: '',
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

function RouterControls() {
  const { search } = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="URL">{search}</output>
      <button onClick={() => navigate(-1)}>Retour navigateur</button>
      <button onClick={() => navigate(1)}>Suivant navigateur</button>
    </>
  );
}

function renderPageWithUrl(search = '') {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[`/suivi-regulier/bilan${search}`]}>
      <RouterControls />
      <BilanDashboard />
    </MemoryRouter>,
  );
}

function currentSearchParams() {
  return new URLSearchParams(screen.getByLabelText('URL').textContent ?? '');
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
    mockUseBilanSteuDetail.mockReturnValue(
      emptyDetailResult as Partial<ReturnType<typeof useBilanSteuDetail>> as ReturnType<typeof useBilanSteuDetail>,
    );
    mockUseBilanSclDetail.mockReturnValue(
      emptyDetailResult as Partial<ReturnType<typeof useBilanSclDetail>> as ReturnType<typeof useBilanSclDetail>,
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
    mockUseBilanSteuParametres.mockReturnValue({ data: [], isLoading: false } as Partial<
      ReturnType<typeof useBilanSteuParametres>
    > as ReturnType<typeof useBilanSteuParametres>);
  });

  it('affiche le tableau STEU par défaut', () => {
    mockUseBilanSteu.mockReturnValue({
      data: { data: [makeSteuRow()], total: 1, page: 1, pageSize: 10 },
    } as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>);
    mockUseBilanSteuDetail.mockReturnValue({
      data: {
        ouvrageDepollutionCode: 'STEU001',
        dateMiseEnService: '2000-01-01',
        exploitants: [{ intervenantNom: 'Exploitant Alpha', intervenantSiret: '12345678901234' }],
        maitresOuvrage: [{ intervenantNom: 'MOA Alpha', intervenantSiret: '43210987654321' }],
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as Partial<ReturnType<typeof useBilanSteuDetail>> as ReturnType<typeof useBilanSteuDetail>);

    renderPage();

    expect(screen.getByRole('columnheader', { name: /bilan écarté par le spe/i })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /code sandre/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /date de mise en service/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /exploitant \/ moa/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /siret établissement/i })).not.toBeInTheDocument();
    expect(screen.getByText(/informations de l'ouvrage/i)).toBeInTheDocument();
    expect(screen.getByText(/code sandre :/i)).toBeInTheDocument();
    expect(screen.getByText('STEU001')).toBeInTheDocument();
    expect(screen.getByText('Exploitant Alpha / MOA Alpha')).toBeInTheDocument();
    expect(screen.getByText('12345678901234 / 43210987654321')).toBeInTheDocument();
    expect(screen.getByText('01/01/2000')).toBeInTheDocument();
  });

  it('affiche les deux valeurs quand exploitant et moa sont identiques', () => {
    mockUseBilanSteu.mockReturnValue({
      data: {
        data: [
          makeSteuRow({
            ouvrageDepollutionCode: 'STEU001',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
    } as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>);
    mockUseBilanSteuDetail.mockReturnValue({
      data: {
        ouvrageDepollutionCode: 'STEU001',
        dateMiseEnService: '2000-01-01',
        exploitants: [{ intervenantNom: 'Syndicat Alpha', intervenantSiret: '11111111111111' }],
        maitresOuvrage: [{ intervenantNom: 'Syndicat Alpha', intervenantSiret: '11111111111111' }],
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as Partial<ReturnType<typeof useBilanSteuDetail>> as ReturnType<typeof useBilanSteuDetail>);

    renderPage();

    expect(screen.getByText('Syndicat Alpha / Syndicat Alpha')).toBeInTheDocument();
    expect(screen.getByText('11111111111111 / 11111111111111')).toBeInTheDocument();
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
          parametreCode: '',
          statut: '',
        },
      }),
    );
    mockUseBilanScl.mockReturnValue({
      data: { data: [makeSclRow()], total: 1, page: 1, pageSize: 10 },
    } as Partial<ReturnType<typeof useBilanScl>> as ReturnType<typeof useBilanScl>);
    mockUseBilanSclDetail.mockReturnValue({
      data: {
        systemeCollecteCode: 'SCL001',
        exploitants: [{ intervenantNom: 'Exploitant Beta', intervenantSiret: '11111111111111' }],
        maitresOuvrage: [{ intervenantNom: 'MOA Beta', intervenantSiret: '22222222222222' }],
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as Partial<ReturnType<typeof useBilanSclDetail>> as ReturnType<typeof useBilanSclDetail>);

    renderPage();

    expect(screen.getByRole('columnheader', { name: /point de mesure/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /volume déversé/i })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /bilan écarté par le spe/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /code sandre/i })).not.toBeInTheDocument();
    expect(screen.getByText('Exploitant Beta / MOA Beta')).toBeInTheDocument();
    expect(screen.queryByText(/date de mise en service/i)).not.toBeInTheDocument();
    expect(screen.getByText('SCL001')).toBeInTheDocument();
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
          parametreCode: '',
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
        total: 501,
        page: 1,
        pageSize: 10,
      },
    } as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>);

    renderPage();

    expect(document.querySelector('.fr-pagination')).not.toBeNull();
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
          parametreCode: '',
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

  it('active le bouton export quand des résultats sont présents', () => {
    mockUseBilanSteu.mockReturnValue({
      data: { data: [makeSteuRow()], total: 1, page: 1, pageSize: 10 },
    } as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>);

    renderPage();

    expect(screen.getByRole('button', { name: /exporter csv/i })).toBeEnabled();
  });

  it('affiche le filtre paramètre en mode STEU', () => {
    renderPage();

    expect(screen.getByLabelText(/paramètre/i)).toBeInTheDocument();
  });

  it('masque le filtre paramètre en mode SCL', () => {
    mockUseBilanFilters.mockReturnValue(
      defaultFilters({
        filters: {
          mode: 'scl',
          year: CURRENT_BILAN_YEAR,
          ouvrageDepollutionCode: '',
          systemeCollecteCode: 'SCL001',
          pointMesureId: '',
          parametreCode: '',
          statut: '',
        },
      }),
    );

    renderPage();

    expect(screen.queryByLabelText(/paramètre/i)).not.toBeInTheDocument();
  });

  it('garde le filtre paramètre actif sans station sélectionnée', () => {
    mockUseBilanFilters.mockReturnValue(
      defaultFilters({
        filters: {
          mode: 'steu',
          year: CURRENT_BILAN_YEAR,
          ouvrageDepollutionCode: '',
          systemeCollecteCode: '',
          pointMesureId: '',
          parametreCode: '',
          statut: '',
        },
      }),
    );

    renderPage();

    expect(screen.getByLabelText(/paramètre/i)).toBeEnabled();
  });

  it('charge les paramètres bilan STEU depuis le référentiel avec la liste autorisée', () => {
    renderPage();

    expect(mockUseBilanSteuParametres).toHaveBeenCalledWith();
    expect(ALLOWED_BILAN_STEU_PARAMETRE_CODES).toContain(1313);
  });

  it('inclut le paramètre sélectionné dans la requête STEU et dans l’export csv', async () => {
    mockDownloadBilanSteuExport.mockResolvedValue({ blob: new Blob(['csv']), filename: 'bilan.csv' });
    mockUseBilanFilters.mockReturnValue(
      defaultFilters({
        filters: {
          mode: 'steu',
          year: CURRENT_BILAN_YEAR,
          ouvrageDepollutionCode: 'STEU001',
          systemeCollecteCode: '',
          pointMesureId: '',
          parametreCode: '1313',
          statut: '',
        },
      }),
    );
    mockUseBilanSteu.mockReturnValue({
      data: { data: [makeSteuRow()], total: 1, page: 1, pageSize: 10 },
    } as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>);

    renderPage();

    expect(mockUseBilanSteu).toHaveBeenCalledWith(expect.objectContaining({ parametreCode: '1313' }), true);

    fireEvent.click(screen.getByRole('button', { name: /exporter csv/i }));

    await waitFor(() => {
      expect(mockDownloadBilanSteuExport).toHaveBeenCalledWith(expect.objectContaining({ parametreCode: '1313' }));
    });
  });

  it('déclenche l’export avec les filtres appliqués', async () => {
    mockDownloadBilanSteuExport.mockResolvedValue({ blob: new Blob(['csv']), filename: 'bilan.csv' });
    mockUseBilanSteu.mockReturnValue({
      data: { data: [makeSteuRow()], total: 1, page: 1, pageSize: 10 },
    } as Partial<ReturnType<typeof useBilanSteu>> as ReturnType<typeof useBilanSteu>);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /exporter csv/i }));

    await waitFor(() => {
      expect(mockDownloadBilanSteuExport).toHaveBeenCalledWith(
        expect.objectContaining({ year: CURRENT_BILAN_YEAR, ouvrageDepollutionCode: 'STEU001', page: 1 }),
      );
    });
  });

  describe('filtres dans l’URL', () => {
    beforeEach(async () => {
      const actual = await vi.importActual<typeof import('../../../hooks/useBilanFilters')>(
        '../../../hooks/useBilanFilters',
      );
      mockUseBilanFilters.mockImplementation(actual.useBilanFilters);
    });

    it('restaure un lien STEU et lance directement la requête sur la page demandée', () => {
      renderPageWithUrl(`?year=${CURRENT_BILAN_YEAR - 1}&ouvrageDepollutionCode=060969152001&page=5`);

      expect(screen.getByRole('combobox', { name: /année/i })).toHaveValue(String(CURRENT_BILAN_YEAR - 1));
      expect(screen.getByRole('combobox', { name: /station/i })).toHaveValue('060969152001');
      expect(mockUseBilanSteu).toHaveBeenCalledWith(
        { year: CURRENT_BILAN_YEAR - 1, ouvrageDepollutionCode: '060969152001', page: 5, pageSize: 20 },
        true,
      );
      expect(mockUseBilanSteu.mock.calls.every(([query]) => query.page === 5)).toBe(true);
      expect(currentSearchParams().get('page')).toBe('5');
    });

    it('restaure les filtres SCL, le point de mesure et le tri', () => {
      mockUsePointsMesure.mockReturnValue({
        data: [
          {
            pointMesureId: 120,
            pointMesureNumero: '120',
            pointMesureLibelle: 'Entrée',
            pointMesureLocalisationGlobale: 'A3',
          },
        ],
      } as ReturnType<typeof usePointsMesure>);

      renderPageWithUrl(
        '?mode=scl&systemeCollecteCode=SCL001&pointMesureId=120&statut=TP&sortBy=date&sortOrder=DESC&page=3',
      );

      expect(screen.getByRole('radio', { name: 'SCL' })).toBeChecked();
      expect(screen.getByRole('combobox', { name: /système de collecte/i })).toHaveValue('SCL001');
      expect(screen.getByRole('combobox', { name: /point de mesures/i })).toHaveValue('A3 - 120 - Entrée');
      expect(screen.getByRole('combobox', { name: /statut/i })).toHaveValue('TP');
      expect(mockUseBilanScl).toHaveBeenCalledWith(
        {
          year: CURRENT_BILAN_YEAR,
          systemeCollecteCode: 'SCL001',
          pointMesureId: 120,
          statut: 'TP',
          sortBy: 'date',
          sortOrder: 'DESC',
          page: 3,
          pageSize: 20,
        },
        true,
      );
      expect(mockUseBilanSteu).toHaveBeenCalledWith(expect.anything(), false);
    });

    it('utilise les valeurs par défaut sans lancer de recherche bilan en l’absence d’ouvrage', () => {
      renderPageWithUrl();

      expect(screen.getByRole('radio', { name: 'STEU' })).toBeChecked();
      expect(screen.getByRole('combobox', { name: /année/i })).toHaveValue(String(CURRENT_BILAN_YEAR));
      expect(mockUseBilanSteu).toHaveBeenCalledWith({ year: CURRENT_BILAN_YEAR, page: 1, pageSize: 20 }, false);
      expect(currentSearchParams().size).toBe(0);
    });

    it('écrit la sélection et sa suppression, en conservant les paramètres étrangers', () => {
      mockUseAsyncOuvragesSearch.mockReturnValue({
        data: [{ ouvrageDepollutionCode: '060969152002', ouvrageDepollutionNom: 'Station Beta' }],
      } as ReturnType<typeof useAsyncOuvragesSearch>);
      renderPageWithUrl('?ouvrageDepollutionCode=060969152001&parametreCode=1313&page=5&source=partage');

      const station = screen.getByRole('combobox', { name: /station/i });
      fireEvent.change(station, { target: { value: 'Beta' } });
      expect(currentSearchParams().get('ouvrageDepollutionCode')).toBe('060969152001');

      fireEvent.click(screen.getByRole('option', { name: 'Station Beta' }));
      expect(station).toHaveValue('Station Beta');
      expect(Object.fromEntries(currentSearchParams())).toEqual({
        year: String(CURRENT_BILAN_YEAR),
        ouvrageDepollutionCode: '060969152002',
        source: 'partage',
      });
      expect(mockUseBilanSteu).toHaveBeenLastCalledWith(
        { year: CURRENT_BILAN_YEAR, ouvrageDepollutionCode: '060969152002', page: 1, pageSize: 20 },
        true,
      );

      fireEvent.mouseDown(screen.getByRole('button', { name: 'Effacer la sélection' }));
      expect(station).toHaveValue('');
      expect(Object.fromEntries(currentSearchParams())).toEqual({
        year: String(CURRENT_BILAN_YEAR),
        source: 'partage',
      });
      expect(mockUseBilanSteu).toHaveBeenLastCalledWith({ year: CURRENT_BILAN_YEAR, page: 1, pageSize: 20 }, false);
    });

    it('restaure la pagination et les filtres avec Précédent / Suivant', () => {
      mockUseBilanSteu.mockReturnValue({
        ...emptySteuResult,
        data: { data: [makeSteuRow()], total: 120, page: 5, pageSize: 20 },
      } as ReturnType<typeof useBilanSteu>);
      renderPageWithUrl(`?year=${CURRENT_BILAN_YEAR - 1}&ouvrageDepollutionCode=060969152001&page=5`);

      fireEvent.click(screen.getByRole('link', { name: '6' }));
      expect(currentSearchParams().get('page')).toBe('6');
      expect(mockUseBilanSteu).toHaveBeenLastCalledWith(expect.objectContaining({ page: 6 }), true);

      fireEvent.change(screen.getByRole('combobox', { name: /année/i }), {
        target: { value: String(CURRENT_BILAN_YEAR) },
      });
      expect(currentSearchParams().has('page')).toBe(false);

      fireEvent.click(screen.getByRole('button', { name: 'Retour navigateur' }));
      expect(screen.getByRole('combobox', { name: /année/i })).toHaveValue(String(CURRENT_BILAN_YEAR - 1));
      expect(mockUseBilanSteu).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 6, year: CURRENT_BILAN_YEAR - 1 }),
        true,
      );
      expect(screen.getByRole('link', { current: true })).toHaveAccessibleName('6');

      fireEvent.click(screen.getByRole('button', { name: 'Retour navigateur' }));
      expect(currentSearchParams().get('page')).toBe('5');
      expect(screen.getByRole('link', { current: true })).toHaveAccessibleName('5');

      fireEvent.click(screen.getByRole('button', { name: 'Suivant navigateur' }));
      expect(currentSearchParams().get('page')).toBe('6');
      expect(screen.getByRole('link', { current: true })).toHaveAccessibleName('6');
    });

    it('réinitialise les filtres dépendants, le tri et la page au changement de mode', () => {
      renderPageWithUrl('?ouvrageDepollutionCode=060969152001&parametreCode=1313&sortBy=date&sortOrder=DESC&page=5');

      fireEvent.click(screen.getByRole('radio', { name: 'SCL' }));
      expect(Object.fromEntries(currentSearchParams())).toEqual({ mode: 'scl', year: String(CURRENT_BILAN_YEAR) });
      expect(mockUseBilanScl).toHaveBeenLastCalledWith({ year: CURRENT_BILAN_YEAR, page: 1, pageSize: 20 }, false);

      fireEvent.click(screen.getByRole('button', { name: 'Retour navigateur' }));
      expect(screen.getByRole('radio', { name: 'STEU' })).toBeChecked();
      expect(screen.getByRole('combobox', { name: /station/i })).toHaveValue('060969152001');
      expect(mockUseBilanSteu).toHaveBeenLastCalledWith(
        expect.objectContaining({ parametreCode: '1313', page: 5, sortOrder: 'DESC' }),
        true,
      );
    });

    it('retire le paramètre lors du changement d’année et écrit le tri en revenant à la page 1', () => {
      mockUseBilanSteu.mockReturnValue({
        ...emptySteuResult,
        data: { data: [makeSteuRow()], total: 120, page: 5, pageSize: 20 },
      } as ReturnType<typeof useBilanSteu>);
      renderPageWithUrl(
        `?year=${CURRENT_BILAN_YEAR - 1}&ouvrageDepollutionCode=060969152001&parametreCode=1313&page=5`,
      );

      fireEvent.change(screen.getByRole('combobox', { name: /année/i }), {
        target: { value: String(CURRENT_BILAN_YEAR) },
      });
      expect(currentSearchParams().has('parametreCode')).toBe(false);
      expect(currentSearchParams().has('page')).toBe(false);

      fireEvent.click(screen.getByRole('button', { name: 'Date' }));
      expect(currentSearchParams().get('sortBy')).toBe('date');
      expect(currentSearchParams().get('sortOrder')).toBe('ASC');
      expect(mockUseBilanSteu).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: 'date', sortOrder: 'ASC', page: 1 }),
        true,
      );
    });

    it.each(['abc', '0', '-1', '1.5'])('ignore les valeurs invalides et la page %s', (page) => {
      renderPageWithUrl(
        `?mode=inconnu&year=2000&page=${page}&sortBy=statut&sortOrder=invalide&ouvrageDepollutionCode=060969152001`,
      );

      expect(screen.getByRole('radio', { name: 'STEU' })).toBeChecked();
      expect(screen.getByRole('combobox', { name: /année/i })).toHaveValue(String(CURRENT_BILAN_YEAR));
      expect(mockUseBilanSteu).toHaveBeenCalledWith(
        { year: CURRENT_BILAN_YEAR, ouvrageDepollutionCode: '060969152001', page: 1, pageSize: 20 },
        true,
      );
    });

    it('ignore un point de mesure et un statut invalides ainsi que les filtres STEU en mode SCL', () => {
      renderPageWithUrl(
        '?mode=scl&systemeCollecteCode=SCL001&pointMesureId=abc&statut=invalide&parametreCode=1313&ouvrageDepollutionCode=060969152001',
      );

      expect(mockUseBilanScl).toHaveBeenCalledWith(
        { year: CURRENT_BILAN_YEAR, systemeCollecteCode: 'SCL001', page: 1, pageSize: 20 },
        true,
      );
      fireEvent.change(screen.getByRole('combobox', { name: /statut/i }), { target: { value: 'TS' } });
      expect(Object.fromEntries(currentSearchParams())).toEqual({
        mode: 'scl',
        year: String(CURRENT_BILAN_YEAR),
        systemeCollecteCode: 'SCL001',
        statut: 'TS',
      });
    });
  });
});
