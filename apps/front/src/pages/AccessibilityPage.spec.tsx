import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccessibilityPage } from './AccessibilityPage';

describe('AccessibilityPage', () => {
  it('renders the accessibility declaration', () => {
    render(<AccessibilityPage />);

    expect(screen.getByRole('heading', { name: 'Déclaration d’accessibilité', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'État de conformité', level: 2 })).toBeInTheDocument();
    expect(screen.getAllByText("Sain'eau")).not.toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Schéma pluriannuel' })).toHaveAttribute(
      'href',
      'https://beta.gouv.fr/accessibilite/schema-pluriannuel',
    );
  });
});
