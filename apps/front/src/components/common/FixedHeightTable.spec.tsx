import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixedHeightTable } from './FixedHeightTable';

describe('FixedHeightTable', () => {
  it('keeps previous rows visible with the fetching design', () => {
    render(
      <FixedHeightTable
        headers={['Nom']}
        data={[['Station epuration']]}
        isFetching
        pageSize={5}
        rowHeight="two-lines"
      />,
    );

    const tableWrapper = screen.getByTitle('Station epuration').closest('.fixed-height-table');

    expect(screen.getByText('Station epuration')).toBeInTheDocument();
    expect(tableWrapper).toHaveClass('fixed-height-table--fetching');
  });

  it('preserves caller styles while applying fixed height variables', () => {
    render(
      <FixedHeightTable
        headers={['Nom']}
        data={[['Station']]}
        pageSize={2}
        rowHeight="one-line"
        style={{ marginTop: '1rem' }}
      />,
    );

    const tableWrapper = screen.getByTitle('Station').closest('.fixed-height-table');

    expect(tableWrapper).toHaveStyle({ marginTop: '1rem' });
    expect(tableWrapper).toHaveStyle('--fixed-height-table-header-height: 3.5rem');
    expect(tableWrapper).toHaveStyle('--fixed-height-table-row-height: 3.5rem');
  });
});
