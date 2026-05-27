import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ControleGroup } from './ControleGroup';
import { EvenementType, ControleName } from '@lib/dossier';
import type { ControleFilterSet, ControleView } from '../types/controle.types';

const defaultActiveFilters: ControleFilterSet = new Set(['warning', 'error']);

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
    const { container } = render(
      <ControleGroup title="Test Group" controles={[]} activeFilters={defaultActiveFilters} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the title and filtered rows', () => {
    render(<ControleGroup title="Test Group" controles={mockControles} activeFilters={defaultActiveFilters} />);

    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('filters to show only errors and warnings by default', () => {
    render(<ControleGroup title="Test Group" controles={mockControles} activeFilters={defaultActiveFilters} />);

    expect(screen.queryByText(/CTL002/)).not.toBeInTheDocument();
    expect(screen.getByText(/CTL003/)).toBeInTheDocument();
    expect(screen.getByText(/CTL004/)).toBeInTheDocument();
  });

  it('shows successful controls when success filter is active', () => {
    render(
      <ControleGroup
        title="Test Group"
        controles={mockControles}
        activeFilters={new Set(['success', 'warning', 'error'])}
      />,
    );

    expect(screen.getByText(/CTL002/)).toBeInTheDocument();
    expect(screen.getByText(/CTL003/)).toBeInTheDocument();
    expect(screen.getByText(/CTL004/)).toBeInTheDocument();
  });

  it('shows only warning rows when only warning filter is active', () => {
    render(<ControleGroup title="Test Group" controles={mockControles} activeFilters={new Set(['warning'])} />);

    expect(screen.queryByText(/CTL002/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CTL003/)).not.toBeInTheDocument();
    expect(screen.getByText(/CTL004/)).toBeInTheDocument();
  });

  it('shows all controls when all filters are deactivated', () => {
    render(<ControleGroup title="Test Group" controles={mockControles} activeFilters={new Set()} />);

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

    render(<ControleGroup title="Grouped Group" controles={groupedMocks} activeFilters={defaultActiveFilters} />);

    expect(screen.getByText('Voir les 2 erreurs')).toBeInTheDocument();

    const accordionLabel = screen.getByText('Voir les 2 erreurs');
    fireEvent.click(accordionLabel);

    expect(screen.getByText('Error message')).toBeInTheDocument();

    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
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

    render(<ControleGroup title="Mixed Group" controles={mixedGroupedMocks} activeFilters={defaultActiveFilters} />);

    expect(screen.getByText('Voir les 2 contrôles')).toBeInTheDocument();

    const accordionLabelBeforeToggle = screen.getByText('Voir les 2 contrôles');
    fireEvent.click(accordionLabelBeforeToggle);
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('updates grouped message when success filter is active', () => {
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

    render(
      <ControleGroup
        title="Mixed Group"
        controles={mixedGroupedMocks}
        activeFilters={new Set(['success', 'warning', 'error'])}
      />,
    );

    expect(screen.getByText('Voir les 3 contrôles')).toBeInTheDocument();

    const accordionLabelAfterToggle = screen.getByText('Voir les 3 contrôles');
    fireEvent.click(accordionLabelAfterToggle);

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});
