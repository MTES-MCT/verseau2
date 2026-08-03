import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ControleName,
  ErrorCode,
  EvenementType,
  MasaStatus,
  SandreAcceptationStatus,
  type ControleDto,
  type ControleSandreDto,
  type MasaDto,
} from '@lib/dossier';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ControlePage } from './Controle';
import * as depotApi from '../api/depot';

vi.mock('../api/depot', async () => {
  const actual = await vi.importActual<typeof import('../api/depot')>('../api/depot');

  return {
    ...actual,
    fetchControles: vi.fn(),
    fetchControlesSandre: vi.fn(),
    fetchMasa: vi.fn(),
  };
});

const mockFetchControles = vi.mocked(depotApi.fetchControles);
const mockFetchControlesSandre = vi.mocked(depotApi.fetchControlesSandre);
const mockFetchMasa = vi.mocked(depotApi.fetchMasa);

const testDate = new Date('2024-01-01T00:00:00.000Z');

function makeControle(overrides: Partial<ControleDto> = {}): ControleDto {
  return {
    id: 'controle-id',
    name: ControleName.CTL002,
    success: true,
    createdAt: testDate,
    updatedAt: testDate,
    ...overrides,
  };
}

function makeControleSandre(overrides: Partial<ControleSandreDto> = {}): ControleSandreDto {
  return {
    id: 'sandre-id',
    acceptationStatus: SandreAcceptationStatus.CONFORMANT,
    isConformant: true,
    createdAt: testDate,
    updatedAt: testDate,
    ...overrides,
  };
}

function makeMasa(overrides: Partial<MasaDto> = {}): MasaDto {
  return {
    id: 'masa-id',
    numeroDepotVerseau1: 'V1-123',
    statut: MasaStatus.INTEGRATION_PARTIELLE,
    rapport: 'Rapport MASA',
    createdAt: testDate,
    updatedAt: testDate,
    ...overrides,
  };
}

function renderControlePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter initialEntries={[{ pathname: '/depots/depot-1/controle', state: { numeroDepotVerseau1: 'V1-123' } }]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/depots/:depotId/controle" element={<ControlePage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function clickFilterCard(label: 'Succès' | 'Avertissement' | 'Erreur' | 'Information') {
  const clickableStatCard = screen.getByTestId(`clickable-stat-card-${label}`);
  const button = clickableStatCard.querySelector('button');

  expect(button).toBeInTheDocument();
  fireEvent.click(button!);
}

async function waitForLoadedPage() {
  await screen.findByRole('heading', { name: /résultats des contrôles/i, level: 1 });
}

describe('ControlePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFetchControles.mockResolvedValue([
      makeControle({
        id: 'roseau-warning',
        name: ControleName.CTL004,
        success: false,
        evenementType: EvenementType.AVERTISSEMENT,
      }),
      makeControle({ id: 'roseau-success', name: ControleName.CTL002, success: true }),
    ]);
    mockFetchControlesSandre.mockResolvedValue([
      makeControleSandre({
        id: 'sandre-error',
        acceptationStatus: SandreAcceptationStatus.NON_CONFORMANT,
        isConformant: false,
        errors: [{ code: 'SANDRE_001', message: 'Erreur SANDRE', location: '/root' }],
      }),
      makeControleSandre({
        id: 'sandre-success',
        acceptationStatus: SandreAcceptationStatus.CONFORMANT,
        isConformant: true,
        errors: [],
      }),
    ]);
    mockFetchMasa.mockResolvedValue(makeMasa({ statut: MasaStatus.INTEGRATION_PARTIELLE }));
  });

  it('applies the shared filter across the three sections and hides empty sections', async () => {
    renderControlePage();

    await waitForLoadedPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /contrôles métiers/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /contrôles sandre/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /intégration des données/i, level: 2 })).toBeInTheDocument();
    });

    clickFilterCard('Avertissement');

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /contrôles métiers/i, level: 2 })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /contrôles sandre/i, level: 2 })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /intégration des données/i, level: 2 })).not.toBeInTheDocument();
    });
  });

  it('shows no table when the selected filter matches no row', async () => {
    mockFetchControles.mockResolvedValue([
      makeControle({
        id: 'roseau-warning-only',
        name: ControleName.CTL004,
        success: false,
        evenementType: EvenementType.AVERTISSEMENT,
      }),
    ]);
    mockFetchControlesSandre.mockResolvedValue([
      makeControleSandre({
        id: 'sandre-success-only',
        acceptationStatus: SandreAcceptationStatus.CONFORMANT,
        isConformant: true,
        errors: [],
      }),
    ]);
    mockFetchMasa.mockResolvedValue(makeMasa({ statut: MasaStatus.INTEGRATION_PARTIELLE }));

    renderControlePage();

    await waitForLoadedPage();
    clickFilterCard('Avertissement');

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /contrôles métiers/i, level: 2 })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /contrôles sandre/i, level: 2 })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /intégration des données/i, level: 2 })).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('clickable-stat-card-Erreur')).toBeInTheDocument();
    expect(screen.queryByTestId('no-controls-alert')).not.toBeInTheDocument();
  });

  it('shows the MASA unavailable message when integration data is missing', async () => {
    mockFetchMasa.mockResolvedValue(null);

    renderControlePage();

    await waitForLoadedPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /intégration des données/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/aucune donnée d'intégration/i)).toBeInTheDocument();
    });
  });

  it('shows PFAS controls in a dedicated section with warning status', async () => {
    mockFetchControles.mockResolvedValue([
      makeControle({
        id: 'roseau-warning',
        name: ControleName.CTL004,
        success: false,
        evenementType: EvenementType.AVERTISSEMENT,
      }),
      makeControle({
        id: 'pfas-information',
        name: ControleName.CTL201,
        success: false,
        evenementType: EvenementType.AVERTISSEMENT,
        error: ErrorCode.E2_201,
        errorParams: ['2024-06-01'],
      }),
      makeControle({
        id: 'pfas-fluorure-warning',
        name: ControleName.CTL202,
        success: false,
        evenementType: EvenementType.AVERTISSEMENT,
        error: ErrorCode.E2_202,
        errorParams: ['2024-06-02'],
      }),
      makeControle({
        id: 'pfas-organic-carbon-warning',
        name: ControleName.CTL203,
        success: false,
        evenementType: EvenementType.AVERTISSEMENT,
        error: ErrorCode.E2_203,
        errorParams: ['2024-06-03'],
      }),
      makeControle({
        id: 'pfas-aof-fluorure-warning',
        name: ControleName.CTL204,
        success: false,
        evenementType: EvenementType.AVERTISSEMENT,
        error: ErrorCode.E2_204,
        errorParams: ['FLUORURE', '2024-06-04'],
      }),
      makeControle({
        id: 'pfas-lq-warning',
        name: ControleName.CTL205,
        success: false,
        evenementType: EvenementType.AVERTISSEMENT,
        error: ErrorCode.E2_205,
        errorParams: ['5980, 5979', '2024-06-05'],
      }),
      makeControle({
        id: 'pfas-quantified-information',
        name: ControleName.CTL207,
        success: false,
        evenementType: EvenementType.INFORMATION,
        error: ErrorCode.E2_207,
        errorParams: ['8986, 6025'],
      }),
      makeControle({
        id: 'pfas-incomplete-warning',
        name: ControleName.CTL208,
        success: false,
        evenementType: EvenementType.AVERTISSEMENT,
        error: ErrorCode.E2_208,
        errorParams: ['22', '2024-06-06', '8858'],
      }),
      makeControle({
        id: 'pfas-excluding-tfa-incomplete-warning',
        name: ControleName.CTL209,
        success: false,
        evenementType: EvenementType.AVERTISSEMENT,
        error: ErrorCode.E2_209,
        errorParams: ['21', '2024-06-07', '7991'],
      }),
      makeControle({
        id: 'pfas-campaign-parameters-warning',
        name: ControleName.CTL210,
        success: false,
        evenementType: EvenementType.AVERTISSEMENT,
        error: ErrorCode.E2_210,
        errorParams: ['2024-06-08', 'DBO5, MES'],
      }),
    ]);
    mockFetchControlesSandre.mockResolvedValue([]);
    mockFetchMasa.mockResolvedValue(null);

    renderControlePage();

    await waitForLoadedPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /contrôles métiers/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /contrôles PFAS/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByTestId('clickable-stat-card-Avertissement')).toBeInTheDocument();
      expect(screen.getByTestId('clickable-stat-card-Information')).toBeInTheDocument();
      expect(screen.getByText(/Paramètre AOF \(code 8986\) absent pour la date 2024-06-01/i)).toBeInTheDocument();
      expect(screen.getByText(/Paramètre Fluorure \(code 7073\) absent pour la date 2024-06-02/i)).toBeInTheDocument();
      expect(screen.getByText(/Carbone organique \(code 1841\) absent pour la date 2024-06-03/i)).toBeInTheDocument();
      expect(
        screen.getByText(/AOF présent mais fluorure absent pour la date 2024-06-04, interprétation impossible/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /La Limite de Quantification \(LQ\) attendue est supérieure à celle de la circulaire pour le\(s\) paramètre\(s\) \[5980, 5979\], pour la date 2024-06-05/i,
        ),
      ).toBeInTheDocument();
      expect(screen.getByText(/Les codes suivants sont quantifiés : 8986, 6025\./i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /Le nombre de paramètres mesurés est égal à 22 pour la campagne de mesure en date de 2024-06-06 \(< à 23\), les codes suivants sont manquant: 8858\./i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Le nombre de paramètres PFAS réglementaires hors TFA mesurés est égal à 21 pour la campagne de mesure en date de 2024-06-07 \(< à 22\), les codes suivants sont manquants : 7991\./i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Les paramètres \(complémentaires et de suivi habituel\) pour la campagne PFAS du 2024-06-08 sont manquants: DBO5, MES\./i,
        ),
      ).toBeInTheDocument();
    });
  });
});
