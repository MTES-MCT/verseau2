import { fireEvent, screen, waitFor } from '@testing-library/react';
import { CURRENT_CONFORMITE_YEAR, FIRST_CONFORMITE_YEAR } from '@lib/dossier';
import type { ConformiteSclDto, ConformiteSteuDetailDto, ConformiteSteuDto } from '@lib/dossier';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConformiteDashboard } from './ConformiteDashboard';
import { renderWithQueryClient } from '../test.helper';

vi.mock('../hooks/useConformite', () => ({
  useConformiteSteu: vi.fn(),
  useConformiteScl: vi.fn(),
  useDetailBilanSteu: vi.fn(),
  useDetailBilanScl: vi.fn(),
}));

import { useConformiteScl, useConformiteSteu, useDetailBilanScl, useDetailBilanSteu } from '../hooks/useConformite';

const mockUseConformiteSteu = vi.mocked(useConformiteSteu);
const mockUseConformiteScl = vi.mocked(useConformiteScl);
const mockUseDetailBilanSteu = vi.mocked(useDetailBilanSteu);
const mockUseDetailBilanScl = vi.mocked(useDetailBilanScl);

const emptySteuResult = {
  data: { data: [], total: 0, page: 1, pageSize: 20 },
  isLoading: false,
  isFetching: false,
  error: null,
};

const emptySclResult = {
  data: { data: [], total: 0, page: 1, pageSize: 20 },
  isLoading: false,
  isFetching: false,
  error: null,
};

const emptySteuDetailResult = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
};

const emptySclDetailResult = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
};

const makeSteuRow = (overrides: Partial<ConformiteSteuDto> = {}): ConformiteSteuDto => ({
  steuCdn: 101,
  ouvrageDepollutionCode: 'STEU001',
  ouvrageDepollutionNom: 'Station Alpha',
  trancheObligationLibelle: '2000 à 9999 EH',
  capaciteNominaleEH: 4500,
  suiviDebutDate: '2024-01-01',
  suiviFinDate: '2024-12-31',
  conformiteNationaleProvisoire: 'C',
  conformiteLocaleProvisoire: 'NC',
  impactConformite: true,
  suiviRegulierEffectue: true,
  suiviRegulierDate: '2025-01-15',
  ...overrides,
});

const makeSclRow = (overrides: Partial<ConformiteSclDto> = {}): ConformiteSclDto => ({
  sclCdn: 202,
  systemeCollecteCode: 'SCL001',
  systemeCollecteNom: 'Collecteur Beta',
  trancheObligationLibelle: 'capacité ≥ 10000 EH',
  typeScl: 'Unitaire',
  suiviDebutDate: '2024-01-01',
  suiviFinDate: '2024-12-31',
  conformiteLocaleTempsPluieProvisoire: 'NC',
  conformiteNationaleTempsPluieProvisoire: 'C',
  impactConformite: true,
  suiviRegulierEffectue: true,
  suiviRegulierDate: '2025-01-15',
  ...overrides,
});

const makeSteuDetail = (overrides: Partial<ConformiteSteuDetailDto> = {}): ConformiteSteuDetailDto => ({
  conformiteLocaleParametresConformesPeriodeNb: 2,
  conformiteLocaleParametresConformesAnneeNb: 4,
  conformiteLocaleParametresNonConformesPeriodeNb: 1,
  conformiteLocaleParametresNonConformesAnneeNb: 2,
  conformiteLocaleRedhibitoiresPeriodeNb: 0,
  conformiteLocaleRedhibitoiresAnneeNb: 1,
  conformiteLocaleParametresConformesPeriodeLb: '2 paramètres',
  conformiteLocaleParametresConformesAnneeLb: '4 paramètres',
  conformiteLocaleParametresNonConformesPeriodeLb: '1 paramètre',
  conformiteLocaleParametresNonConformesAnneeLb: '2 paramètres',
  conformiteLocaleRedhibitoiresPeriodeLb: 'Aucun',
  conformiteLocaleRedhibitoiresAnneeLb: '1 bilan',
  conformiteNationaleParametresConformesPeriodeNb: 3,
  conformiteNationaleParametresConformesAnneeNb: 6,
  conformiteNationaleParametresNonConformesPeriodeNb: 1,
  conformiteNationaleParametresNonConformesAnneeNb: 2,
  conformiteNationaleRedhibitoiresPeriodeNb: 0,
  conformiteNationaleRedhibitoiresAnneeNb: 1,
  conformiteNationaleParametresConformesPeriodeLb: '3 paramètres',
  conformiteNationaleParametresConformesAnneeLb: '6 paramètres',
  conformiteNationaleParametresNonConformesPeriodeLb: '1 paramètre',
  conformiteNationaleParametresNonConformesAnneeLb: '2 paramètres',
  conformiteNationaleRedhibitoiresPeriodeLb: 'Aucun',
  conformiteNationaleRedhibitoiresAnneeLb: '1 bilan',
  hcnfPeriodeNb: 1,
  hcnfAnneeNb: 3,
  hctsPeriodeNb: 0,
  hctsAnneeNb: 2,
  hcnfPeriodeLb: '1 bilan',
  hcnfAnneeLb: '3 bilans',
  hctsPeriodeLb: 'Aucun',
  hctsAnneeLb: '2 bilans',
  evenementsPeriodeNb: 2,
  evenementsAnneeNb: 5,
  ...overrides,
});

function renderPage() {
  return renderWithQueryClient(<ConformiteDashboard />);
}

describe('ConformiteDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, 'dsfr', {
      configurable: true,
      value: (element: HTMLElement) => ({
        modal: {
          disclose: () => {
            element.setAttribute('open', 'true');
            element.dispatchEvent(new Event('dsfr.disclose'));
          },
          conceal: () => {
            element.removeAttribute('open');
            element.dispatchEvent(new Event('dsfr.conceal'));
          },
        },
      }),
    });

    mockUseConformiteSteu.mockReturnValue(emptySteuResult as unknown as ReturnType<typeof useConformiteSteu>);
    mockUseConformiteScl.mockReturnValue(emptySclResult as unknown as ReturnType<typeof useConformiteScl>);
    mockUseDetailBilanSteu.mockReturnValue(emptySteuDetailResult as unknown as ReturnType<typeof useDetailBilanSteu>);
    mockUseDetailBilanScl.mockReturnValue(emptySclDetailResult as unknown as ReturnType<typeof useDetailBilanScl>);

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(),
      },
    });
  });

  it('affiche le tableau STEU par défaut', () => {
    // Arrange
    mockUseConformiteSteu.mockReturnValue({
      data: { data: [makeSteuRow()], total: 1, page: 1, pageSize: 20 },
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useConformiteSteu>);

    // Act
    renderPage();

    // Assert
    expect(screen.getByRole('columnheader', { name: /code sandre/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^nom$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /capacité nominale/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /conformité nationale/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /conformité locale/i })).toBeInTheDocument();
  });

  it('change les colonnes quand on bascule vers SCL', async () => {
    // Arrange
    mockUseConformiteSteu.mockReturnValue({
      data: { data: [makeSteuRow()], total: 1, page: 1, pageSize: 20 },
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useConformiteSteu>);
    mockUseConformiteScl.mockReturnValue({
      data: { data: [makeSclRow()], total: 1, page: 1, pageSize: 20 },
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useConformiteScl>);
    renderPage();

    // Act
    fireEvent.click(screen.getByRole('radio', { name: /scl/i }));

    // Assert
    expect(screen.getByRole('columnheader', { name: /type/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /conformité locale temps pluie/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /conformité nationale temps pluie/i })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /capacité nominale/i })).not.toBeInTheDocument();
  });

  it('affiche le filtre année de 2006 à l’année courante et déclenche la recherche avec cette année', async () => {
    // Arrange
    mockUseConformiteSteu.mockReturnValue({
      data: { data: [makeSteuRow()], total: 1, page: 1, pageSize: 20 },
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useConformiteSteu>);

    // Act
    renderPage();
    const yearSelect = screen.getByLabelText(/année/i);
    fireEvent.change(yearSelect, { target: { value: '2018' } });
    fireEvent.click(screen.getByRole('button', { name: /rechercher/i }));

    // Assert
    expect(screen.getByRole('option', { name: String(CURRENT_CONFORMITE_YEAR) })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: String(FIRST_CONFORMITE_YEAR) })).toBeInTheDocument();

    await waitFor(() => {
      expect(mockUseConformiteSteu).toHaveBeenLastCalledWith(expect.objectContaining({ year: 2018 }), true);
    });
  });

  it('ouvre le détail STEU dans une modale et navigue au suivant', async () => {
    // Arrange
    mockUseConformiteSteu.mockReturnValue({
      data: {
        data: [
          makeSteuRow({ steuCdn: 101, ouvrageDepollutionCode: 'STEU001' }),
          makeSteuRow({ steuCdn: 102, ouvrageDepollutionCode: 'STEU002', ouvrageDepollutionNom: 'Station Beta' }),
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useConformiteSteu>);
    mockUseDetailBilanSteu.mockImplementation(
      (steuCdn) =>
        ({
          data:
            steuCdn === 101
              ? makeSteuDetail({ conformiteLocaleParametresConformesPeriodeLb: '2 paramètres A' })
              : makeSteuDetail({ conformiteLocaleParametresConformesPeriodeLb: '2 paramètres B' }),
          isLoading: false,
          isError: false,
          error: null,
        }) as unknown as ReturnType<typeof useDetailBilanSteu>,
    );
    renderPage();

    // Act
    fireEvent.click(screen.getAllByRole('button', { name: /voir le détail/i })[0]);

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/détail conformité steu/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/paramètres conformes \(local\)/i)).toBeInTheDocument();
    expect(screen.getByText('2 paramètres A')).toBeInTheDocument();
    expect(screen.getByText('Bilans avec événements')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /afficher le détail suivant/i }));

    await waitFor(() => {
      expect(screen.getByText('2 paramètres B')).toBeInTheDocument();
    });
  });

  it('copie la synthèse avec les données avec impact', async () => {
    // Arrange
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    mockUseConformiteSteu.mockReturnValue({
      data: { data: [makeSteuRow({ ouvrageDepollutionCode: 'STEU777' })], total: 1, page: 1, pageSize: 20 },
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useConformiteSteu>);
    renderPage();

    // Act
    fireEvent.click(screen.getByRole('button', { name: /copier la synthèse/i }));

    // Assert
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('avec impact'));
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('STEU777'));
    });
  });

  it('affiche l’état de chargement', () => {
    // Arrange
    mockUseConformiteSteu.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useConformiteSteu>);

    // Act
    renderPage();

    // Assert
    expect(screen.getByText(/chargement des données/i)).toBeInTheDocument();
  });

  it('affiche une alerte en cas d’erreur', () => {
    // Arrange
    mockUseConformiteSteu.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error('Erreur réseau'),
    } as unknown as ReturnType<typeof useConformiteSteu>);

    // Act
    renderPage();

    // Assert
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/erreur réseau/i)).toBeInTheDocument();
  });

  it('affiche le message vide quand total vaut 0', () => {
    // Arrange
    mockUseConformiteSteu.mockReturnValue({
      data: { data: [], total: 0, page: 1, pageSize: 20 },
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useConformiteSteu>);

    // Act
    renderPage();

    // Assert
    expect(screen.getByText(/aucun résultat trouvé/i)).toBeInTheDocument();
  });

  it('affiche la pagination quand total dépasse la page', () => {
    // Arrange
    mockUseConformiteSteu.mockReturnValue({
      data: {
        data: Array.from({ length: 20 }, (_, index) =>
          makeSteuRow({ steuCdn: index + 1, ouvrageDepollutionCode: `STEU${index + 1}` }),
        ),
        total: 45,
        page: 1,
        pageSize: 20,
      },
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useConformiteSteu>);

    // Act
    renderPage();

    // Assert
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });

  it('masque la pagination quand total tient sur une page', () => {
    // Arrange
    mockUseConformiteSteu.mockReturnValue({
      data: { data: [makeSteuRow()], total: 5, page: 1, pageSize: 20 },
      isLoading: false,
      isFetching: false,
      error: null,
    } as unknown as ReturnType<typeof useConformiteSteu>);

    // Act
    renderPage();

    // Assert
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });
});
