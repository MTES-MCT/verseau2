import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DepotStatus } from '@lib/dossier';
import { DepotUploadRecapPage } from './DepotUploadRecap';
import { initializeUpload, uploadDepotFile, completeUpload } from '../api/depot';

vi.mock('../api/depot', () => ({ initializeUpload: vi.fn(), uploadDepotFile: vi.fn(), completeUpload: vi.fn() }));
vi.mock('../api/referentiel', () => ({ fetchParametresFromCodes: vi.fn().mockResolvedValue([]) }));
vi.mock('../hooks/useCheckDroitsDeDepot', () => ({ useCheckDroitsDeDepot: () => ({ status: 'authorized' }) }));
vi.mock('@lib/parser', () => ({
  parseScenarioAssainissementXml: vi.fn().mockResolvedValue({ scenario: {} }),
  checkScenarioCodeAndVersion: () => true,
  isFluxQualifie: () => false,
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/recap', state: { fileName: 'test.xml', fileContent: '<root/>' } }]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/recap" element={<DepotUploadRecapPage />} />
          <Route path="*" element={<h1>Tableau de bord</h1>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('Dépôt direct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.mocked(initializeUpload).mockResolvedValue({
      depotId: 'dep_123',
      uploadUrl: 'https://s3.test/upload',
      headers: { 'Content-Type': 'application/xml' },
      expiresAt: new Date(Date.now() + 900000).toISOString(),
    });
    vi.mocked(uploadDepotFile).mockResolvedValue(undefined);
    vi.mocked(completeUpload).mockResolvedValue({
      id: 'dep_123',
      nomOriginalFichier: 'test.xml',
      status: DepotStatus.EN_COURS_DE_TRAITEMENT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('waits for S3 before confirming and navigating', async () => {
    let uploaded!: () => void;
    vi.mocked(uploadDepotFile).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        uploaded = resolve;
      }),
    );
    renderPage();
    const button = await screen.findByRole('button', { name: /finaliser le dépôt/i });
    fireEvent.click(button);
    await screen.findByRole('status');
    expect(button).toBeDisabled();
    expect(completeUpload).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Tableau de bord' })).not.toBeInTheDocument();
    uploaded();
    await screen.findByRole('heading', { name: 'Tableau de bord' });
    expect(completeUpload).toHaveBeenCalledExactlyOnceWith('dep_123');
  });

  it('retries only confirmation after its failure', async () => {
    vi.mocked(completeUpload).mockRejectedValueOnce(new Error('API unavailable'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /finaliser le dépôt/i }));
    await screen.findByText('Le dépôt n’a pas pu être confirmé');
    fireEvent.click(screen.getByRole('button', { name: /finaliser le dépôt/i }));
    await screen.findByRole('heading', { name: 'Tableau de bord' });
    expect(initializeUpload).toHaveBeenCalledTimes(1);
    expect(uploadDepotFile).toHaveBeenCalledTimes(1);
    expect(completeUpload).toHaveBeenCalledTimes(2);
  });

  it('does not confirm a failed S3 upload and retries the same upload session', async () => {
    vi.mocked(uploadDepotFile).mockRejectedValueOnce(new Error('S3 unavailable'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /finaliser le dépôt/i }));
    await screen.findByText('Le dépôt n’a pas pu être confirmé');
    expect(completeUpload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /finaliser le dépôt/i }));
    await waitFor(() => expect(completeUpload).toHaveBeenCalledTimes(1));
    expect(initializeUpload).toHaveBeenCalledTimes(1);
    expect(uploadDepotFile).toHaveBeenCalledTimes(2);
  });
});
