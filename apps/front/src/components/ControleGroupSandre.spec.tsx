import { render, screen, within } from '@testing-library/react';
import { SandreAcceptationStatus, type ControleSandreDto } from '@lib/dossier';
import { describe, expect, it } from 'vitest';
import { mapSandreControlesToView } from '../pages/controleMapper';
import { ControleSandreGroup } from './ControleGroupSandre';

const warning = {
  code: 'MISSING_XML_DECLARATION',
  ligne: '',
  colonne: '',
  message: 'La déclaration XML est absente ou incorrecte.',
  location: '',
  severite: 'Warning',
};

function renderSandre(errors: ControleSandreDto['errors'], isConformant = true) {
  const controles = mapSandreControlesToView([
    {
      id: 'sandre-id',
      acceptationStatus: isConformant ? SandreAcceptationStatus.CONFORMANT : SandreAcceptationStatus.NON_CONFORMANT,
      isConformant,
      errors,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  return render(<ControleSandreGroup title="Contrôles SANDRE" controles={controles} activeFilters={new Set()} />);
}

describe('ControleSandreGroup', () => {
  it.each(['Warning', 'warning', 'WARNING'])('displays severity %s as an avertissement', (severite) => {
    renderSandre([{ ...warning, severite }]);

    const row = screen.getByRole('row', { name: /acceptation: conforme/i });
    expect(within(row).getByText('Avertissement')).toHaveClass('fr-badge--warning');
    expect(within(row).getByRole('cell', { name: warning.message })).toBeInTheDocument();
    expect(screen.queryByText(/MISSING_XML_DECLARATION|Sévérité/)).not.toBeInTheDocument();
    expect(screen.queryByText('Rejeté')).not.toBeInTheDocument();
  });

  it('displays grouped warnings with a warning badge and warning count', () => {
    renderSandre([warning, { ...warning, code: 'OTHER_WARNING', message: 'Autre avertissement' }]);

    expect(screen.getByText('Avertissement')).toHaveClass('fr-badge--warning');
    expect(screen.getByRole('button', { name: 'Voir les 2 avertissements' })).toBeInTheDocument();
    expect(screen.queryByText('Rejeté')).not.toBeInTheDocument();
  });

  it('displays only the message without code, location, line, column or severity', () => {
    renderSandre([{ ...warning, location: '/root', ligne: '12', colonne: '4' }]);

    expect(screen.getByRole('cell', { name: warning.message })).toBeInTheDocument();
    expect(screen.queryByText(/MISSING_XML_DECLARATION|\/root|Ligne 12|Colonne 4|Sévérité/)).not.toBeInTheDocument();
  });

  it('keeps mixed warning/error groups rejected and counts each severity separately', () => {
    renderSandre([warning, { code: 'INVALID_XML', message: 'XML invalide', severite: 'Error' }], false);

    expect(screen.getByText('Rejeté')).toHaveClass('fr-badge--error');
    expect(screen.getByRole('button', { name: 'Voir les 1 erreur et 1 avertissement' })).toBeInTheDocument();
  });

  it.each([undefined, 'Error', 'Unknown'])('keeps severity %s classified as an error', (severite) => {
    renderSandre([{ code: 'INVALID_XML', message: 'XML invalide', severite }], false);

    expect(screen.getByText('Rejeté')).toHaveClass('fr-badge--error');
  });

  it('keeps a conformant response without diagnostics successful', () => {
    renderSandre([]);

    expect(screen.getByText('Succès')).toHaveClass('fr-badge--success');
  });
});
