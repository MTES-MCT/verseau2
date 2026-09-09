import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '../routes';
import { AppFooter } from './Footer';

describe('AppFooter', () => {
  it('links the accessibility status to the accessibility declaration', () => {
    render(<AppFooter />);

    expect(screen.getByRole('link', { name: 'Accessibilité : non conforme' })).toHaveAttribute(
      'href',
      AppRoutes.ACCESSIBILITY,
    );
  });
});
