import { AntivirusStatus, DepotStatus, EtapeMetier, type DepotDto } from '@lib/dossier';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

  it('affiche le nom complet du fichier en tooltip même avec un numéro de dépôt', () => {
    const longFileName = '202512-argences_031402001000_un_nom_long_trestreslong.xml';
    mockUseDepots.mockReturnValue({
      data: [{ ...depot, numeroDepotVerseau1: 'DEPOT693914', nomOriginalFichier: longFileName }],
      isLoading: false,
      isFetching: false,
      error: null,
      isExpertNational: false,
    } as ReturnType<typeof useDepots>);
    renderDashboard();

    const fileCell = screen.getByTitle(longFileName);
    expect(fileCell).toBeInTheDocument();
    expect(fileCell).toHaveClass('fixed-height-table__cell-content');
    expect(screen.getByText('DEPOT693914')).toBeInTheDocument();
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

  it.each([undefined, AntivirusStatus.PENDING, AntivirusStatus.INFECTED, AntivirusStatus.ERROR])(
    'désactive le téléchargement XML et explique le blocage en tooltip pour le statut %s, y compris administrateur',
    (antivirusStatus) => {
      mockUseDepots.mockReturnValue({
        data: [{ ...depot, antivirusStatus }],
        isLoading: false,
        isFetching: false,
        error: null,
        isExpertNational: true,
      } as ReturnType<typeof useDepots>);
      renderDashboard();
      const button = screen.getByRole('button', { name: 'XML' });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(mockUseRapportAndXmlDownload().handleDownloadXml).not.toHaveBeenCalled();
      const tooltip = screen.getByRole('tooltip');
      const tooltipText = 'XML indisponible : contrôle antivirus non validé';
      expect(tooltip).toHaveTextContent(tooltipText);
      expect(tooltip).toHaveClass('fr-tooltip');
      expect(button).toHaveAccessibleDescription(tooltipText);
      expect(button.parentElement).toHaveAttribute('tabindex', '0');
      expect(button.parentElement).toHaveAccessibleDescription(tooltipText);
      expect(screen.queryByText(/Contrôle antivirus (en attente|indisponible)/)).not.toBeInTheDocument();
      expect(screen.queryByText('Fichier rejeté par l’antivirus')).not.toBeInTheDocument();
    },
  );

  it('autorise uniquement le téléchargement explicitement clean', async () => {
    mockUseDepots.mockReturnValue({
      data: [{ ...depot, antivirusStatus: AntivirusStatus.CLEAN }],
      isLoading: false,
      isFetching: false,
      error: null,
      isExpertNational: false,
    } as ReturnType<typeof useDepots>);
    renderDashboard();
    const button = screen.getByRole('button', { name: 'XML' });
    expect(button).toBeEnabled();
    expect(button).toHaveAccessibleDescription('Télécharger le fichier XML');
    expect(button.parentElement).not.toHaveAttribute('tabindex');
    fireEvent.click(button);
    expect(mockUseRapportAndXmlDownload().handleDownloadXml).toHaveBeenCalledWith(
      depot.id,
      depot.nomOriginalFichier,
      AntivirusStatus.CLEAN,
    );
  });
});
