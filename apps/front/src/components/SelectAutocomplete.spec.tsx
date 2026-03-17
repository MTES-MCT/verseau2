import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SelectAutocomplete } from './SelectAutocomplete';

describe('SelectAutocomplete', () => {
  const options = [
    { value: 'paris', label: 'Paris' },
    { value: 'lyon', label: 'Lyon' },
    { value: 'marseille', label: 'Marseille' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it('renders correctly with given label', () => {
    const onChange = vi.fn();
    render(<SelectAutocomplete label="Ville" options={options} onChange={onChange} />);

    expect(screen.getByLabelText('Ville')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders hintText when provided', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} hintText="Saisissez une ville" />);
    expect(screen.getByText('Saisissez une ville')).toBeInTheDocument();
  });

  it('renders placeholder on the input', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} placeholder="Rechercher…" />);
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Rechercher…');
  });

  it('marks the input as required when required prop is set', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} required />);
    expect(screen.getByRole('combobox')).toBeRequired();
  });

  it('displays the label of the pre-selected value', () => {
    render(<SelectAutocomplete label="Ville" options={options} value="lyon" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveValue('Lyon');
  });

  it('renders custom render node inside option', () => {
    const optionsWithRender = [
      { value: 'custom', label: 'Custom', render: <span data-testid="custom-render">Rendu custom</span> },
    ];
    render(<SelectAutocomplete label="Ville" options={optionsWithRender} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByTestId('custom-render')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Dropdown open / close
  // ---------------------------------------------------------------------------

  it('shows options when clicking input', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox'));

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    options.forEach((option) => {
      expect(within(listbox).getByText(option.label)).toBeInTheDocument();
    });
  });

  it('sets aria-expanded to true when open', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes the dropdown on Escape key', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the dropdown on Tab key', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Tab' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the dropdown when clicking outside', () => {
    render(
      <div>
        <SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />
        <button>Outside</button>
      </div>,
    );

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not show the listbox when no option matches the filter', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz' } });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  it('filters options based on input value', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pa' } });

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('Paris')).toBeInTheDocument();
    expect(within(listbox).queryByText('Lyon')).not.toBeInTheDocument();
    expect(within(listbox).queryByText('Marseille')).not.toBeInTheDocument();
  });

  it('is case-insensitive when filtering', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'LYON' } });

    expect(screen.getByText('Lyon')).toBeInTheDocument();
    expect(screen.queryByText('Paris')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Selection via click
  // ---------------------------------------------------------------------------

  it('calls onChange with selected value when option is clicked', () => {
    const Wrapper = () => {
      const [value, setValue] = useState<string | null>(null);
      return <SelectAutocomplete label="Ville" options={options} value={value} onChange={setValue} />;
    };

    render(<Wrapper />);

    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.mouseDown(screen.getByText('Lyon'));
    fireEvent.click(screen.getByText('Lyon'));

    expect(input).toHaveValue('Lyon');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('marks the selected option with aria-selected', () => {
    render(<SelectAutocomplete label="Ville" options={options} value="paris" onChange={vi.fn()} />);

    // Open with empty search so all options are visible
    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: '' } });

    const parisOption = screen.getByRole('option', { name: 'Paris' });
    expect(parisOption).toHaveAttribute('aria-selected', 'true');

    const lyonOption = screen.getByRole('option', { name: 'Lyon' });
    expect(lyonOption).toHaveAttribute('aria-selected', 'false');
  });

  // ---------------------------------------------------------------------------
  // Selection via keyboard
  // ---------------------------------------------------------------------------

  it('opens dropdown with ArrowDown when closed', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('navigates options with ArrowDown and ArrowUp keys', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

    const input = screen.getByRole('combobox');
    fireEvent.click(input);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-0'));

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-1'));

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-0'));
  });

  it('selects highlighted option on Enter key', () => {
    const onChange = vi.fn();
    render(<SelectAutocomplete label="Ville" options={options} onChange={onChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 0 → Paris
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 1 → Lyon
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('lyon');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selects unique filtered option on Enter when none is highlighted', () => {
    const onChange = vi.fn();
    render(<SelectAutocomplete label="Ville" options={options} onChange={onChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'mars' } }); // only Marseille matches
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('marseille');
  });

  it('ArrowUp does not go below index 0', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // highlight 0
    fireEvent.keyDown(input, { key: 'ArrowUp' }); // stay at 0

    expect(input).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-0'));
  });

  // ---------------------------------------------------------------------------
  // Clearing the input
  // ---------------------------------------------------------------------------

  it('calls onChange(null) when input is cleared', () => {
    const onChange = vi.fn();
    render(<SelectAutocomplete label="Ville" options={options} value="paris" onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(null);
  });

  // ---------------------------------------------------------------------------
  // onInputChange callback
  // ---------------------------------------------------------------------------

  it('calls onInputChange when typing in the input', () => {
    const onInputChange = vi.fn();
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} onInputChange={onInputChange} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ly' } });

    expect(onInputChange).toHaveBeenCalledWith('ly');
  });

  it('calls onInputChange with selected label after selection', () => {
    const onInputChange = vi.fn();
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} onInputChange={onInputChange} />);

    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.mouseDown(screen.getByText('Marseille'));
    fireEvent.click(screen.getByText('Marseille'));

    expect(onInputChange).toHaveBeenLastCalledWith('Marseille');
  });

  // ---------------------------------------------------------------------------
  // Blur behaviour
  // ---------------------------------------------------------------------------

  it('clears the input on blur when search text was entered but nothing was selected', () => {
    const onChange = vi.fn();

    render(
      <div>
        <SelectAutocomplete label="Ville" options={options} onChange={onChange} />
        <button>Autre</button>
      </div>,
    );

    const input = screen.getByRole('combobox');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'xyz' } }); // no match, no selection
    // Simulate blur leaving the container
    const container = input.closest('.select-autocomplete-container') as HTMLElement;
    fireEvent.blur(container, { relatedTarget: screen.getByRole('button', { name: 'Autre' }) });

    // onChange(null) called to clear since nothing was selected
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  // ---------------------------------------------------------------------------
  // Toggle button (chevron)
  // ---------------------------------------------------------------------------

  it('renders a toggle button', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Ouvrir la liste' })).toBeInTheDocument();
  });

  it('opens the dropdown with all options when toggle button is clicked', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Ouvrir la liste' }));

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    options.forEach((option) => {
      expect(within(listbox).getByText(option.label)).toBeInTheDocument();
    });
  });

  it('closes the dropdown when toggle button is clicked while open', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Fermer la liste' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows all options via toggle even when a value is already selected', () => {
    render(<SelectAutocomplete label="Ville" options={options} value="lyon" onChange={vi.fn()} />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Ouvrir la liste' }));

    const listbox = screen.getByRole('listbox');
    options.forEach((option) => {
      expect(within(listbox).getByText(option.label)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Clear button (cross)
  // ---------------------------------------------------------------------------

  it('does not render the clear button when no value is selected', () => {
    render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Effacer la sélection' })).not.toBeInTheDocument();
  });

  it('renders the clear button when a value is selected', () => {
    render(<SelectAutocomplete label="Ville" options={options} value="paris" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Effacer la sélection' })).toBeInTheDocument();
  });

  it('calls onChange(null) and empties the input when the clear button is clicked', () => {
    const Wrapper = () => {
      const [value, setValue] = useState<string | null>('paris');
      return <SelectAutocomplete label="Ville" options={options} value={value} onChange={setValue} />;
    };
    render(<Wrapper />);

    expect(screen.getByRole('combobox')).toHaveValue('Paris');

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Effacer la sélection' }));

    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Effacer la sélection' })).not.toBeInTheDocument();
  });

  it('closes the dropdown when the clear button is clicked', () => {
    const Wrapper = () => {
      const [value, setValue] = useState<string | null>('paris');
      return <SelectAutocomplete label="Ville" options={options} value={value} onChange={setValue} />;
    };
    render(<Wrapper />);

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Effacer la sélection' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the dropdown on a single click after clearing', () => {
    const Wrapper = () => {
      const [value, setValue] = useState<string | null>('paris');
      return <SelectAutocomplete label="Ville" options={options} value={value} onChange={setValue} />;
    };
    render(<Wrapper />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Effacer la sélection' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Listbox positioning (dynamic top via ResizeObserver / getBoundingClientRect)
  // ---------------------------------------------------------------------------

  describe('listbox positioning relative to the native input', () => {
    // jsdom returns all zeros for getBoundingClientRect. We mock it on
    // Element.prototype before each render (so the useEffect sees the mocked
    // values on mount) using CSS class names to discriminate elements:
    //   .select-autocomplete-input-wrapper  → top: 100
    //   .select-autocomplete-container      → top: 100
    //   input (combobox)                    → top: 130, bottom: 170
    //
    // Expected computed values:
    //   actionsTop  = inputTop  - wrapperTop  = 130 - 100 = 30
    //   listboxTop  = inputBottom - containerTop = 170 - 100 = 70

    beforeEach(() => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        if (this.classList.contains('select-autocomplete-input-wrapper')) {
          return { top: 100, bottom: 180, left: 0, right: 300, width: 300, height: 80 } as DOMRect;
        }
        if (this.classList.contains('select-autocomplete-container')) {
          return { top: 100, bottom: 210, left: 0, right: 300, width: 300, height: 110 } as DOMRect;
        }
        if (this.tagName === 'INPUT') {
          return { top: 130, bottom: 170, left: 0, right: 300, width: 300, height: 40 } as DOMRect;
        }
        return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 } as DOMRect;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('positions the listbox flush under the input in default state', () => {
      render(<SelectAutocomplete label="Ville" options={options} onChange={vi.fn()} />);

      fireEvent.click(screen.getByRole('combobox'));

      // listboxTop = inputBottom - containerTop = 170 - 100 = 70
      expect(screen.getByRole('listbox')).toHaveStyle({ top: '70px' });
    });

    it('positions the listbox flush under the input in error state', () => {
      render(
        <SelectAutocomplete
          label="Ville"
          options={options}
          onChange={vi.fn()}
          state="error"
          stateRelatedMessage="Veuillez sélectionner une ville"
        />,
      );

      fireEvent.click(screen.getByRole('combobox'));

      expect(screen.getByRole('listbox')).toHaveStyle({ top: '70px' });
    });

    it('positions the listbox flush under the input in success state', () => {
      render(
        <SelectAutocomplete
          label="Ville"
          options={options}
          onChange={vi.fn()}
          state="success"
          stateRelatedMessage="Ville valide"
        />,
      );

      fireEvent.click(screen.getByRole('combobox'));

      expect(screen.getByRole('listbox')).toHaveStyle({ top: '70px' });
    });
  });

  it('passes stateRelatedMessage to the underlying Input when state is error', () => {
    render(
      <SelectAutocomplete
        label="Ville"
        options={options}
        onChange={vi.fn()}
        state="error"
        stateRelatedMessage="Veuillez sélectionner une ville"
      />,
    );

    expect(screen.getByText('Veuillez sélectionner une ville')).toBeInTheDocument();
  });

  it('fills the input with the selected value when clicking an option in error state', () => {
    const Wrapper = () => {
      const [value, setValue] = useState<string | null>(null);
      return (
        <SelectAutocomplete
          label="Ville"
          options={options}
          value={value}
          onChange={setValue}
          state="error"
          stateRelatedMessage="Veuillez sélectionner une ville"
        />
      );
    };
    render(<Wrapper />);

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.mouseDown(screen.getByText('Lyon'));
    fireEvent.click(screen.getByText('Lyon'));

    expect(screen.getByRole('combobox')).toHaveValue('Lyon');
  });

  it('renders and operates the clear button when state is success', () => {
    const Wrapper = () => {
      const [value, setValue] = useState<string | null>('paris');
      return (
        <SelectAutocomplete
          label="Ville"
          options={options}
          value={value}
          onChange={setValue}
          state="success"
          stateRelatedMessage="Ville valide"
        />
      );
    };
    render(<Wrapper />);

    // Clear button is visible with a selected value in success state
    const clearButton = screen.getByRole('button', { name: 'Effacer la sélection' });
    expect(clearButton).toBeInTheDocument();

    // The success message is displayed
    expect(screen.getByText('Ville valide')).toBeInTheDocument();

    // Clicking the clear button resets the value and hides the button
    fireEvent.mouseDown(clearButton);

    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Effacer la sélection' })).not.toBeInTheDocument();
  });
});
