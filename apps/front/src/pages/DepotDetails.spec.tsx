import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DepotDetailsPage } from './DepotDetails';
import { renderWithQueryClient } from '../test.helper';

// Mock all hooks used by useMesureFilters
vi.mock('../hooks/useMesures', () => ({
  useMesures: vi.fn(),
}));
vi.mock('../hooks/useOuvrages', () => ({
  useOuvrages: vi.fn(),
}));
vi.mock('../hooks/useSystemesCollecte', () => ({
  useSystemesCollecte: vi.fn(),
}));
vi.mock('../hooks/usePointsMesure', () => ({
  usePointsMesure: vi.fn(),
}));
vi.mock('../hooks/useParametresMesure', () => ({
  useParametresMesure: vi.fn(),
}));
vi.mock('../hooks/useFinalites', () => ({
  useFinalites: vi.fn(),
}));
vi.mock('../hooks/useStatuts', () => ({
  useStatuts: vi.fn(),
}));
vi.mock('../hooks/useQualifications', () => ({
  useQualifications: vi.fn(),
}));

import { useMesures } from '../hooks/useMesures';
import { useOuvrages } from '../hooks/useOuvrages';
import { useSystemesCollecte } from '../hooks/useSystemesCollecte';
import { usePointsMesure } from '../hooks/usePointsMesure';
import { useParametresMesure } from '../hooks/useParametresMesure';
import { useFinalites } from '../hooks/useFinalites';
import { useStatuts } from '../hooks/useStatuts';
import { useQualifications } from '../hooks/useQualifications';

const mockUseMesures = vi.mocked(useMesures);
const mockUseOuvrages = vi.mocked(useOuvrages);
const mockUseSystemesCollecte = vi.mocked(useSystemesCollecte);
const mockUsePointsMesure = vi.mocked(usePointsMesure);
const mockUseParametresMesure = vi.mocked(useParametresMesure);
const mockUseFinalites = vi.mocked(useFinalites);
const mockUseStatuts = vi.mocked(useStatuts);
const mockUseQualifications = vi.mocked(useQualifications);

const emptyNomenclatureResult = {
  data: [],
  isLoading: false,
};

const emptyMesuresResult = {
  data: { data: [], total: 0, page: 1, pageSize: 20 },
  isLoading: false,
  error: null,
};

const emptyOuvragesResult = {
  data: [],
  isLoading: false,
  error: null,
};

const emptyPointsMesureResult = {
  data: [],
  isLoading: false,
  error: null,
};

const emptyParametresResult = {
  data: [],
  isLoading: false,
  error: null,
};

const makeMesure = (overrides = {}) => ({
  steuSandreCda: 'STEU001',
  steuNom: 'Station test',
  sclSandreCda: 'SCL001',
  sclNom: 'Collecteur test',
  localisationPoint: 'A',
  numPointAgence: 'AE001',
  numPoint: 'P1',
  nomPoint: 'Point 1',
  date: '2024-06-15T00:00:00.000Z',
  parametreCode: 'MES_CO',
  parametreNom: 'Matières en suspension',
  valeur: 12.5,
  unite: 'mg/L',
  finalite: null,
  statut: null,
  qualification: 'Brut',
  ...overrides,
});

describe('DepotDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOuvrages.mockReturnValue(emptyOuvragesResult as unknown as ReturnType<typeof useOuvrages>);
    mockUseSystemesCollecte.mockReturnValue(emptyOuvragesResult as unknown as ReturnType<typeof useSystemesCollecte>);
    mockUseMesures.mockReturnValue(emptyMesuresResult as unknown as ReturnType<typeof useMesures>);
    mockUsePointsMesure.mockReturnValue(emptyPointsMesureResult as unknown as ReturnType<typeof usePointsMesure>);
    mockUseParametresMesure.mockReturnValue(emptyParametresResult as unknown as ReturnType<typeof useParametresMesure>);
    mockUseFinalites.mockReturnValue(emptyNomenclatureResult as unknown as ReturnType<typeof useFinalites>);
    mockUseStatuts.mockReturnValue(emptyNomenclatureResult as unknown as ReturnType<typeof useStatuts>);
    mockUseQualifications.mockReturnValue(emptyNomenclatureResult as unknown as ReturnType<typeof useQualifications>);
  });

  it('renders the page title', () => {
    renderWithQueryClient(<DepotDetailsPage />);

    expect(screen.getByRole('heading', { name: /détail des mesures déposées/i, level: 1 })).toBeInTheDocument();
  });

  it('displays the J-7 information text', () => {
    renderWithQueryClient(<DepotDetailsPage />);

    expect(screen.getByText(/données mises à jour chaque semaine \(J-7\)/i)).toBeInTheDocument();
  });

  it('renders the radio button for ouvrage type selection', () => {
    renderWithQueryClient(<DepotDetailsPage />);

    expect(screen.getByRole('radio', { name: /station \(steu\)/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /système de collecte/i })).toBeInTheDocument();
    // STEU is selected by default
    expect(screen.getByRole('radio', { name: /station \(steu\)/i })).toBeChecked();
  });

  it('renders all filter labels', () => {
    renderWithQueryClient(<DepotDetailsPage />);

    expect(screen.getByLabelText(/ouvrage \(steu\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date début/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date fin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/paramètre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/finalité/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/statut/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/qualification/i)).toBeInTheDocument();
  });

  it('changes ouvrage dropdown label when SCL radio is selected', () => {
    renderWithQueryClient(<DepotDetailsPage />);

    // Switch to SCL
    fireEvent.click(screen.getByRole('radio', { name: /système de collecte/i }));

    // The dropdown label should change from "Ouvrage (STEU)" to something else
    expect(screen.queryByLabelText(/ouvrage \(steu\)/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/tous les systèmes/i)).toBeInTheDocument();
  });

  it('renders ouvrage dropdown showing options after clicking', () => {
    mockUseOuvrages.mockReturnValue({
      data: [
        { steuSandreCda: 'STEU001', steuNom: 'Station A' },
        { steuSandreCda: 'STEU002', steuNom: 'Station B' },
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useOuvrages>);

    renderWithQueryClient(<DepotDetailsPage />);

    // Open the autocomplete dropdown
    fireEvent.click(screen.getByLabelText(/ouvrage \(steu\)/i));

    expect(screen.getByRole('option', { name: /Station A/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Station B/i })).toBeInTheDocument();
  });

  it('shows loading state while data is loading', () => {
    mockUseMesures.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useMesures>);

    renderWithQueryClient(<DepotDetailsPage />);

    expect(screen.getByText(/chargement des mesures/i)).toBeInTheDocument();
  });

  it('shows error alert when fetch fails', () => {
    mockUseMesures.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    } as unknown as ReturnType<typeof useMesures>);

    renderWithQueryClient(<DepotDetailsPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders table with all column headers', () => {
    renderWithQueryClient(<DepotDetailsPage />);

    const table = screen.getByRole('table');
    expect(table.querySelector('th[scope="col"]')).toBeInTheDocument();

    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toContain('Date');
    expect(headerTexts).toContain('Point de mesure');
    expect(headerTexts).toContain('Localisation');
    expect(headerTexts).toContain('Paramètre');
    expect(headerTexts).toContain('Valeur');
    expect(headerTexts).toContain('Unité');
    expect(headerTexts).toContain('Qualification');
    expect(headerTexts).toContain('Finalité');
    expect(headerTexts).toContain('Statut');
  });

  it('renders mesure data in the table', () => {
    mockUseMesures.mockReturnValue({
      data: { data: [makeMesure()], total: 1, page: 1, pageSize: 20 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMesures>);

    renderWithQueryClient(<DepotDetailsPage />);

    expect(screen.getByText('Matières en suspension')).toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
    expect(screen.getByText('mg/L')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('displays qualification badge for "Brut" mesure', () => {
    mockUseMesures.mockReturnValue({
      data: { data: [makeMesure({ qualification: 'Brut' })], total: 1, page: 1, pageSize: 20 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMesures>);

    renderWithQueryClient(<DepotDetailsPage />);

    // Brut → info badge (inside tbody, not the filter dropdown option)
    const badge = screen.getByRole('table').querySelector('tbody .fr-badge');
    expect(badge).toHaveTextContent('Brut');
  });

  it('displays qualification badge for "Qualifié" mesure', () => {
    mockUseMesures.mockReturnValue({
      data: { data: [makeMesure({ qualification: 'Qualifié' })], total: 1, page: 1, pageSize: 20 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMesures>);

    renderWithQueryClient(<DepotDetailsPage />);

    // Qualifié → success badge (inside tbody, not the filter dropdown option)
    const badge = screen.getByRole('table').querySelector('tbody .fr-badge');
    expect(badge).toHaveTextContent('Qualifié');
  });

  it('shows "Aucune mesure trouvée" when total is 0', () => {
    renderWithQueryClient(<DepotDetailsPage />);

    expect(screen.getByText(/aucune mesure trouvée/i)).toBeInTheDocument();
  });

  it('shows pagination info text when data is present', () => {
    mockUseMesures.mockReturnValue({
      data: { data: [makeMesure()], total: 1, page: 1, pageSize: 20 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMesures>);

    renderWithQueryClient(<DepotDetailsPage />);

    expect(screen.getByText(/affichage de 1 à 1 sur 1 mesure/i)).toBeInTheDocument();
  });

  it('shows pagination component when total > pageSize', () => {
    const data = Array.from({ length: 20 }, (_, i) => makeMesure({ alrCdn: i, parametreCode: `PAR_${i}` }));
    mockUseMesures.mockReturnValue({
      data: { data, total: 45, page: 1, pageSize: 20 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMesures>);

    renderWithQueryClient(<DepotDetailsPage />);

    // DSFR Pagination renders numbered page links
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });

  it('does not show pagination when total <= pageSize', () => {
    mockUseMesures.mockReturnValue({
      data: { data: [makeMesure()], total: 5, page: 1, pageSize: 20 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useMesures>);

    renderWithQueryClient(<DepotDetailsPage />);

    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });

  it('shows validation error on search without ouvrage selected (STEU mode)', () => {
    renderWithQueryClient(<DepotDetailsPage />);

    fireEvent.click(screen.getByRole('button', { name: /rechercher/i }));

    expect(screen.getByText(/veuillez sélectionner au moins un ouvrage/i)).toBeInTheDocument();
  });

  it('shows validation error on search without SCL selected (SCL mode)', () => {
    renderWithQueryClient(<DepotDetailsPage />);

    // Switch to SCL mode
    fireEvent.click(screen.getByRole('radio', { name: /système de collecte/i }));
    fireEvent.click(screen.getByRole('button', { name: /rechercher/i }));

    expect(screen.getByText(/veuillez sélectionner au moins un système de collecte/i)).toBeInTheDocument();
  });

  it('renders statut dropdown populated with nomenclature items', () => {
    mockUseStatuts.mockReturnValue({
      data: [
        { code: 'A', label: 'Donnée brute' },
        { code: 'B', label: 'Pré-qualification' },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useStatuts>);

    renderWithQueryClient(<DepotDetailsPage />);
    fireEvent.click(screen.getByLabelText(/statut/i));

    expect(screen.getByRole('option', { name: /donnée brute/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /pré-qualification/i })).toBeInTheDocument();
  });

  it('renders qualification dropdown populated with nomenclature items', () => {
    mockUseQualifications.mockReturnValue({
      data: [
        { code: '1', label: 'Correcte' },
        { code: '2', label: 'Incorrecte' },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useQualifications>);

    renderWithQueryClient(<DepotDetailsPage />);
    fireEvent.click(screen.getByLabelText(/qualification/i));

    expect(screen.getByRole('option', { name: 'Correcte' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Incorrecte' })).toBeInTheDocument();
  });

  it('shows loading placeholder for statut and qualification when loading', () => {
    mockUseStatuts.mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<typeof useStatuts>);
    mockUseQualifications.mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<
      typeof useQualifications
    >);

    renderWithQueryClient(<DepotDetailsPage />);

    expect(screen.getAllByPlaceholderText(/chargement/i).length).toBeGreaterThanOrEqual(2);
  });
});
