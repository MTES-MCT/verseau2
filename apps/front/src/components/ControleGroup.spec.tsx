import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ControleGroup } from './ControleGroup';
import { EvenementType, ControleName } from '@lib/dossier';
import type { ControleView } from '../types/controle.types';

describe('ControleGroup', () => {
  const mockControles: ControleView[] = [
    {
      name: ControleName.CTL002,
      success: true,
      evenementType: undefined,
      message: 'Succès 1',
    },
    {
      name: ControleName.CTL003,
      success: false,
      evenementType: EvenementType.ERREUR,
      message: 'Erreur 1',
    },
    {
      name: ControleName.CTL004,
      success: false,
      evenementType: EvenementType.AVERTISSEMENT,
      message: 'Avertissement 1',
    },
  ];

  it('renders null when no controles are provided', () => {
    const { container } = render(<ControleGroup title="Test Group" controles={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the title and stat cards', () => {
    render(<ControleGroup title="Test Group" controles={mockControles} />);

    expect(screen.getByText('Test Group')).toBeInTheDocument();

    expect(screen.getByText('Succès')).toBeInTheDocument();
    // In StatCards, we have 1 Success, 1 Warning, 1 Error.
    // getByText('1') will find all of them.
    expect(screen.getAllByText('1')).toHaveLength(3);
  });

  it('filters out successful controls by default', () => {
    render(<ControleGroup title="Test Group" controles={mockControles} />);

    // CTL002 is successful
    expect(screen.queryByText(/CTL002/)).not.toBeInTheDocument();
    expect(screen.getByText(/CTL003/)).toBeInTheDocument();
    expect(screen.getByText(/CTL004/)).toBeInTheDocument();
  });

  it('shows successful controls when toggle is switched', () => {
    render(<ControleGroup title="Test Group" controles={mockControles} />);

    const toggle = screen.getByLabelText('Afficher tous les contrôles (incluant les succès)');
    fireEvent.click(toggle);

    expect(screen.getByText(/CTL002/)).toBeInTheDocument();
    expect(screen.getByText(/CTL003/)).toBeInTheDocument();
    expect(screen.getByText(/CTL004/)).toBeInTheDocument();
  });

  it('groups identical controls and shows accordion for groups', () => {
    const groupedMocks: ControleView[] = [
      {
        name: ControleName.CTL005,
        success: false,
        evenementType: EvenementType.ERREUR,
        message: 'Error message',
      },
      {
        name: ControleName.CTL005,
        success: false,
        evenementType: EvenementType.ERREUR,
        message: 'Error message',
      },
    ];

    render(<ControleGroup title="Grouped Group" controles={groupedMocks} />);

    expect(screen.getByText('Voir les 2 erreurs')).toBeInTheDocument();

    const accordionLabel = screen.getByText('Voir les 2 erreurs');
    fireEvent.click(accordionLabel);

    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Check for the count badge (there will be one in StatCard and one in the badge)
    expect(screen.getAllByText('2')).toHaveLength(2);
  });
});
