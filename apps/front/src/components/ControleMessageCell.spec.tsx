import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ControleMessageCell } from './ControleMessageCell';
import { EvenementType, ControleName } from '@lib/dossier';
import type { TableDataRow } from '../hooks/useControleTableData';
import type { ControleFilterSet, ControleView } from '../types/controle.types';

describe('ControleMessageCell', () => {
  const activeFilters: ControleFilterSet = new Set(['error', 'warning', 'success']);

  it('renders a simple message when not a group', () => {
    const row: TableDataRow = {
      isGroup: false,
      name: ControleName.CTL002,
      evenementType: undefined,
      message: 'Simple success message',
    };

    render(<ControleMessageCell row={row} activeFilters={activeFilters} />);
    expect(screen.getByText('Simple success message')).toBeInTheDocument();
  });

  it('renders an accordion for a grouped row', async () => {
    const row: TableDataRow = {
      isGroup: true,
      name: ControleName.CTL003,
      evenementType: EvenementType.ERREUR,
      message: 'Group message',
      groupData: {
        controls: [
          { name: ControleName.CTL003, success: false, evenementType: EvenementType.ERREUR, message: 'Error 1' },
          { name: ControleName.CTL003, success: true, evenementType: undefined, message: 'Success 1' },
        ],
        errorCount: 1,
        warningCount: 0,
        informationCount: 0,
        successCount: 1,
      },
    };

    render(<ControleMessageCell row={row} activeFilters={activeFilters} />);

    expect(screen.getByText('Group message')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /Group message/i });
    expect(button).toBeInTheDocument();
  });

  it('handles pagination when there are many message groups', async () => {
    // Create 7 unique messages (more than the current 5 limit)
    const controls: ControleView[] = Array.from({ length: 7 }, (_, i) => ({
      name: ControleName.CTL004,
      success: true,
      evenementType: undefined,
      message: `Message ${i}`,
    }));

    const row: TableDataRow = {
      isGroup: true,
      name: ControleName.CTL004,
      evenementType: undefined,
      message: 'Many messages',
      groupData: {
        controls,
        errorCount: 0,
        warningCount: 0,
        informationCount: 0,
        successCount: 7,
      },
    };

    render(<ControleMessageCell row={row} activeFilters={activeFilters} />);

    const accordionButton = screen.getByRole('button', { name: /Many messages/i });
    fireEvent.click(accordionButton);

    // Should show 5 items initially
    expect(screen.getByText('Message 0')).toBeInTheDocument();
    expect(screen.getByText('Message 4')).toBeInTheDocument();
    expect(screen.queryByText('Message 5')).not.toBeInTheDocument();

    // Should show "Afficher 2 suivants" button
    const showMoreButton = screen.getByRole('button', { name: /Afficher 2 suivants/i });
    expect(showMoreButton).toBeInTheDocument();

    // Click "Afficher plus"
    fireEvent.click(showMoreButton);

    // Should now show all items
    expect(screen.getByText('Message 5')).toBeInTheDocument();
    expect(screen.getByText('Message 6')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Afficher.*suivants/i })).not.toBeInTheDocument();
  });

  it('respects active filters', async () => {
    const row: TableDataRow = {
      isGroup: true,
      name: ControleName.CTL005,
      evenementType: EvenementType.ERREUR,
      message: 'Filtered messages',
      groupData: {
        controls: [
          { name: ControleName.CTL005, success: false, evenementType: EvenementType.ERREUR, message: 'Error message' },
          { name: ControleName.CTL005, success: true, evenementType: undefined, message: 'Success message' },
        ],
        errorCount: 1,
        warningCount: 0,
        informationCount: 0,
        successCount: 1,
      },
    };

    // Only show errors
    render(<ControleMessageCell row={row} activeFilters={new Set(['error'])} />);

    const accordionButton = screen.getByRole('button', { name: /Filtered messages/i });
    fireEvent.click(accordionButton);

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });
});
