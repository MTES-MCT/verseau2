import { render, screen } from '@testing-library/react';
import { TransmissionASRetardDashboard } from './TransmissionASRetardDashboard';
import { describe, it, vi, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';

// Mocks
vi.mock('../../../hooks/useTransmissionASRetard', () => ({
  useTransmissionASRetardSteu: vi.fn(() => ({ data: { data: [], total: 0 }, isLoading: false, isFetching: false })),
  useTransmissionASRetardScl: vi.fn(() => ({ data: { data: [], total: 0 }, isLoading: false, isFetching: false })),
}));
vi.mock('../../../hooks/useAsyncOuvragesSearch', () => ({ useAsyncOuvragesSearch: vi.fn(() => ({ data: [] })) }));
vi.mock('../../../hooks/useAsyncSystemesCollecteSearch', () => ({
  useAsyncSystemesCollecteSearch: vi.fn(() => ({ data: [] })),
}));

describe('TransmissionASRetardDashboard', () => {
  it('renders correctly', () => {
    const queryClient = new QueryClient();
    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <TransmissionASRetardDashboard />
        </QueryClientProvider>
      </BrowserRouter>,
    );
    expect(screen.getByText(/Transmission AS des STEU en retard/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      /veuillez sélectionner un ouvrage pour afficher les résultats/i,
    );
    expect(screen.queryByRole('button', { name: /exporter csv/i })).not.toBeInTheDocument();
  });
});
