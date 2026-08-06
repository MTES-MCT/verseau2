import { DepotStatus, EtapeMetier, type DepotDto } from '@lib/dossier';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDepots } from '../hooks/useDepots';
import { useRapportAndXmlDownload } from '../hooks/useRapportAndXmlDownload';
import { Dashboard } from './Dashboard';

vi.mock('../hooks/useDepots', () => ({
  useDepots: vi.fn(),
}));

vi.mock('../hooks/useRapportAndXmlDownload', () => ({
  useRapportAndXmlDownload: vi.fn(),
}));

vi.mock('../components/IndicateursTable', () => ({
  IndicateursTable: () => null,
}));

const mockUseDepots = vi.mocked(useDepots);
const mockUseRapportAndXmlDownload = vi.mocked(useRapportAndXmlDownload);

const depot: DepotDto = {
  id: 'depot-1',
  numeroDepotVerseau1: undefined,
  nomOriginalFichier: 'bilan.xml',
  status: DepotStatus.EN_COURS_DE_TRAITEMENT,
  etapeMetier: EtapeMetier.CONTROLE_METIER,
  rapportPath: null,
  createdAt: new Date(2026, 7, 6, 10, 52),
  updatedAt: new Date(2026, 7, 6, 10, 52),
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDepots.mockReturnValue({
      data: [depot],
      isLoading: false,
      isFetching: false,
      error: null,
      isExpertNational: false,
    } as ReturnType<typeof useDepots>);
    mockUseRapportAndXmlDownload.mockReturnValue({
      downloadingDepotId: null,
      handleDownload: vi.fn(),
      downloadingXmlId: null,
      handleDownloadXml: vi.fn(),
      downloadError: null,
      setDownloadError: vi.fn(),
    });
  });

  it("affiche l'heure de dépôt dans le fuseau du navigateur", () => {
    renderDashboard();

    expect(screen.getByText('06/08/2026 10:52')).toBeInTheDocument();
    expect(screen.queryByText('06/08/2026 06:52')).not.toBeInTheDocument();
  });

  it("conserve la classe de largeurs fixes lorsqu'un numéro de dépôt est absent", () => {
    renderDashboard();

    const table = screen.getByRole('table');
    const dataRow = screen.getAllByRole('row')[1];

    expect(table.closest('.fixed-height-table')).toHaveClass('dashboard-depots-table');
    expect(within(dataRow).getAllByRole('cell')).toHaveLength(6);
    expect(within(dataRow).getAllByRole('cell')[0]).toBeEmptyDOMElement();
  });
});
