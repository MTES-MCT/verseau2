import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ControleGroup } from './ControleGroup';
import { EvenementType, ControleName } from '@lib/dossier';
import type { ControleView } from '../types/controle.types';

const getStatCard = (label: string) => {
  const labelElement = screen.getByText(label);
  const container = labelElement.closest('.fr-col') as HTMLElement;
  expect(container).toBeInTheDocument();
  return container;
};

const clickClickableStatCard = (label: string) => {
  const clickableStatCard = screen.getByTestId(`clickable-stat-card-${label}`);
  const button = clickableStatCard.querySelector('button');
  expect(button).toBeInTheDocument();
  fireEvent.click(button!);
};

const expectStatCardCount = (label: string, count: string) => {
  const statCard = getStatCard(label);
  const countElement = within(statCard).getByText(count);
  expect(countElement).toHaveClass('fr-h2', 'fr-mb-0');
  return countElement;
};

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

  it('filters to show only errors and warnings by default', () => {
    render(<ControleGroup title="Test Group" controles={mockControles} />);

    // By default, warning and error filters are active
    // CTL002 is successful, should not be shown
    expect(screen.queryByText(/CTL002/)).not.toBeInTheDocument();
    expect(screen.getByText(/CTL003/)).toBeInTheDocument();
    expect(screen.getByText(/CTL004/)).toBeInTheDocument();
  });

  it('shows successful controls when success filter is activated', () => {
    render(<ControleGroup title="Test Group" controles={mockControles} />);

    // Initially, CTL002 (success) is not shown
    expect(screen.queryByText(/CTL002/)).not.toBeInTheDocument();

    // Click on Succès StatCard to activate success filter
    clickClickableStatCard('Succès');

    // Now all three types should be visible
    expect(screen.getByText(/CTL002/)).toBeInTheDocument();
    expect(screen.getByText(/CTL003/)).toBeInTheDocument();
    expect(screen.getByText(/CTL004/)).toBeInTheDocument();
  });

  it('toggles filters when clicking StatCards', () => {
    render(<ControleGroup title="Test Group" controles={mockControles} />);

    // By default, errors and warnings are shown
    expect(screen.queryByText(/CTL002/)).not.toBeInTheDocument();
    expect(screen.getByText(/CTL003/)).toBeInTheDocument();
    expect(screen.getByText(/CTL004/)).toBeInTheDocument();

    // Click error filter to deactivate it
    clickClickableStatCard('Erreur');

    // Now only warning should be shown
    expect(screen.queryByText(/CTL002/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CTL003/)).not.toBeInTheDocument();
    expect(screen.getByText(/CTL004/)).toBeInTheDocument();

    // Click error filter again to reactivate it
    clickClickableStatCard('Erreur');

    // Error should be back
    expect(screen.getByText(/CTL003/)).toBeInTheDocument();
    expect(screen.getByText(/CTL004/)).toBeInTheDocument();
  });

  it('shows all controls when all filters are deactivated', () => {
    render(<ControleGroup title="Test Group" controles={mockControles} />);

    // Deactivate both active filters
    clickClickableStatCard('Avertissement');
    clickClickableStatCard('Erreur');

    // Now all controls should be shown (no filters active = show all)
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

    // Check for the count badge - there's now 2 occurrences: StatCard + Result column badge
    expect(screen.getAllByText('2')).toHaveLength(2);
  });

  it('groups identical controls with success, avertissements and errors and shows accordion for groups', () => {
    const mixedGroupedMocks: ControleView[] = [
      {
        name: ControleName.CTL005,
        success: true,
        evenementType: undefined,
        message: 'Success message',
      },
      {
        name: ControleName.CTL005,
        success: false,
        evenementType: EvenementType.AVERTISSEMENT,
        message: 'Warning message',
      },
      {
        name: ControleName.CTL005,
        success: false,
        evenementType: EvenementType.ERREUR,
        message: 'Error message',
      },
    ];

    render(<ControleGroup title="Mixed Group" controles={mixedGroupedMocks} />);

    // Initially only Error and Warning are shown (2 items) - default filters
    expect(screen.getByText('Voir les 2 contrôles')).toBeInTheDocument();
    expectStatCardCount('Succès', '1');
    expectStatCardCount('Avertissement', '1');
    expectStatCardCount('Erreur', '1');

    const accordionLabelBeforeToggle = screen.getByText('Voir les 2 contrôles');
    fireEvent.click(accordionLabelBeforeToggle);
    // No Success shown yet
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Click success filter to activate it
    clickClickableStatCard('Succès');

    expect(screen.getByText('Voir les 3 contrôles')).toBeInTheDocument();

    const accordionLabelAfterToggle = screen.getByText('Voir les 3 contrôles');
    fireEvent.click(accordionLabelAfterToggle);

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});
