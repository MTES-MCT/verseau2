import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReconnectionLayout } from './ReconnectionLayout';

function StatefulPage() {
  return <input aria-label="Nom du fichier" defaultValue="analyse.xml" />;
}

const defaultProps = {
  isReconnecting: false,
  hasError: false,
  onRetry: vi.fn(),
  onLogin: vi.fn(),
};

describe('ReconnectionLayout', () => {
  it('keeps silent refreshes visually hidden', () => {
    render(
      <ReconnectionLayout {...defaultProps}>
        <StatefulPage />
      </ReconnectionLayout>,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Reconnexion' })).not.toBeInTheDocument();
  });

  it('announces a blocking reconnection over the visible mounted page and disables interaction', () => {
    render(
      <ReconnectionLayout {...defaultProps} isReconnecting>
        <StatefulPage />
      </ReconnectionLayout>,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveFocus();
    expect(screen.getByRole('heading', { level: 2, name: 'Reconnexion' })).toBeInTheDocument();
    expect(screen.getByText('Veuillez patienter pendant le renouvellement de votre session.')).toBeInTheDocument();
    const pageInput = screen.getByLabelText('Nom du fichier');
    expect(pageInput).toBeVisible();
    expect(pageInput.closest('[inert]')).toHaveAttribute('aria-hidden', 'true');
    expect(status.closest('.reconnection-layout__overlay')?.nextElementSibling).toContainElement(pageInput);
  });

  it('preserves form state while the overlay appears and disappears', () => {
    const { rerender } = render(
      <ReconnectionLayout {...defaultProps}>
        <StatefulPage />
      </ReconnectionLayout>,
    );
    const input = screen.getByLabelText('Nom du fichier');
    fireEvent.change(input, { target: { value: 'nouvelle-analyse.xml' } });

    rerender(
      <ReconnectionLayout {...defaultProps} isReconnecting>
        <StatefulPage />
      </ReconnectionLayout>,
    );
    rerender(
      <ReconnectionLayout {...defaultProps}>
        <StatefulPage />
      </ReconnectionLayout>,
    );

    expect(screen.getByLabelText('Nom du fichier')).toHaveValue('nouvelle-analyse.xml');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows keyboard-accessible recovery actions after failure', () => {
    const onRetry = vi.fn();
    const onLogin = vi.fn();
    render(
      <ReconnectionLayout {...defaultProps} hasError onRetry={onRetry} onLogin={onLogin}>
        <StatefulPage />
      </ReconnectionLayout>,
    );

    expect(screen.queryByRole('heading', { name: 'Reconnexion' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveFocus();

    const retryButton = screen.getByRole('button', { name: 'Réessayer' });
    retryButton.focus();
    expect(retryButton).toHaveFocus();
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);

    const loginButton = screen.getByRole('button', { name: 'Se connecter' });
    loginButton.focus();
    expect(loginButton).toHaveFocus();
    fireEvent.click(loginButton);
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('restores focus when blocking ends', () => {
    const { rerender } = render(
      <ReconnectionLayout {...defaultProps}>
        <StatefulPage />
      </ReconnectionLayout>,
    );
    const input = screen.getByLabelText('Nom du fichier');
    input.focus();

    rerender(
      <ReconnectionLayout {...defaultProps} isReconnecting>
        <StatefulPage />
      </ReconnectionLayout>,
    );
    expect(screen.getByRole('status')).toHaveFocus();

    rerender(
      <ReconnectionLayout {...defaultProps}>
        <StatefulPage />
      </ReconnectionLayout>,
    );
    expect(input).toHaveFocus();
  });
});
