import React, { useState, useRef, useEffect, useId, type ReactNode } from 'react';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { fr } from '@codegouvfr/react-dsfr';
import './SelectAutocomplete.css';

export interface AutocompleteOption {
  value: string;
  /** Text used for filtering and displayed in the input field once selected. */
  label: string;
  /** Custom rendering inside the dropdown list. Falls back to `label` when omitted. */
  render?: ReactNode;
}

export interface SelectAutocompleteProps {
  label: string;
  hintText?: string;
  state?: 'success' | 'error' | 'default';
  stateRelatedMessage?: string;
  options: AutocompleteOption[];
  value?: string | null;
  onChange: (value: string | null) => void;
  onInputChange?: (inputValue: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
}

export const SelectAutocomplete = ({
  label,
  hintText,
  state,
  stateRelatedMessage,
  options,
  value,
  onChange,
  onInputChange,
  placeholder,
  id: idProp,
  required,
}: SelectAutocompleteProps) => {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const listboxId = `${id}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const [actionsTop, setActionsTop] = useState<number | undefined>(undefined);
  const [listboxTop, setListboxTop] = useState<number | undefined>(undefined);

  // Dynamically position action buttons and listbox aligned with the native <input>.
  // The DSFR fr-input-group contains label + input + error/valid message, so
  // fixed CSS offsets break when the state message wraps to multiple lines.
  // We measure the input position relative to each parent and update via ResizeObserver.
  useEffect(() => {
    const inputEl = inputRef.current;
    const wrapperEl = inputWrapperRef.current;
    const containerEl = containerRef.current;
    if (!inputEl || !wrapperEl || !containerEl) {
      return;
    }

    const update = () => {
      const inputRect = inputEl.getBoundingClientRect();
      const wrapperRect = wrapperEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      setActionsTop(inputRect.top - wrapperRect.top);
      setListboxTop(inputRect.bottom - containerRect.top);
    };

    update();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(update);
    observer.observe(wrapperEl);
    return () => observer.disconnect();
  }, [state, stateRelatedMessage, label, hintText]);

  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? '';

  const displayedValue = isOpen && searchText !== null ? searchText : selectedLabel;

  const filteredOptions =
    isOpen && searchText !== null
      ? options.filter((option) => option.label.toLowerCase().includes(searchText.toLowerCase()))
      : options;

  const openWithSearch = (text: string) => {
    setSearchText(text);
    setIsOpen(true);
    setHighlightedIndex(-1);
    if (onInputChange) {
      onInputChange(text);
    }
  };

  const openAllOptions = () => {
    setSearchText(null);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const closeAndReset = () => {
    setIsOpen(false);
    setSearchText(null);
    setHighlightedIndex(-1);
  };

  const selectOption = (option: AutocompleteOption) => {
    onChange(option.value);
    if (onInputChange) {
      onInputChange(option.label);
    }
    closeAndReset();
    inputRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(null);
    if (onInputChange) {
      onInputChange('');
    }
    closeAndReset();
  };

  const handleToggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      closeAndReset();
    } else {
      openAllOptions();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    openWithSearch(text);
    if (text === '') {
      onChange(null);
    }
  };

  const handleFocus = () => {
    if (!isOpen) {
      setSearchText(selectedLabel);
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSearchText('');
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          selectOption(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length === 1) {
          selectOption(filteredOptions[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeAndReset();
        break;
      case 'Tab':
        closeAndReset();
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget)) {
      // If user typed something invalid (no selection), clear the field
      if (isOpen && searchText !== null && !value) {
        onChange(null);
        if (onInputChange) {
          onInputChange('');
        }
      }
      closeAndReset();
    }
  };

  // Click outside closes the dropdown — external system subscription, setState in callback is correct
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeAndReset();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted option into view — DOM mutation, not React state
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const optionElement = listboxRef.current.children[highlightedIndex] as HTMLElement;
      if (optionElement) {
        const listbox = listboxRef.current;
        const optionTop = optionElement.offsetTop;
        const optionBottom = optionTop + optionElement.offsetHeight;
        if (optionTop < listbox.scrollTop) {
          listbox.scrollTop = optionTop;
        } else if (optionBottom > listbox.scrollTop + listbox.clientHeight) {
          listbox.scrollTop = optionBottom - listbox.clientHeight;
        }
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div ref={containerRef} className="select-autocomplete-container" onBlur={handleBlur}>
      <div ref={inputWrapperRef} className="select-autocomplete-input-wrapper">
        <Input
          label={label}
          hintText={hintText}
          state={state}
          stateRelatedMessage={stateRelatedMessage}
          classes={{
            root: 'select-autocomplete-input-group',
            // nativeInputOrTextArea is the only way to add a class to the native <input>
            // in DSFR: the component overrides nativeInputProps.className internally.
            nativeInputOrTextArea: 'select-autocomplete-input',
          }}
          nativeInputProps={{
            id,
            ref: inputRef,
            type: 'text',
            value: displayedValue,
            onChange: handleInputChange,
            onKeyDown: handleKeyDown,
            onFocus: handleFocus,
            onClick: handleFocus,
            placeholder,
            required,
            role: 'combobox',
            'aria-expanded': isOpen,
            'aria-autocomplete': 'list',
            'aria-controls': isOpen ? listboxId : undefined,
            'aria-activedescendant': highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined,
            autoComplete: 'off',
          }}
        />
        <div
          className="select-autocomplete-actions"
          style={actionsTop !== undefined ? { top: actionsTop, bottom: 'auto' } : undefined}
        >
          {value && (
            <button
              type="button"
              className="select-autocomplete-btn select-autocomplete-clear"
              aria-label="Effacer la sélection"
              tabIndex={-1}
              onMouseDown={handleClear}
            >
              <span className={fr.cx('fr-icon-close-line')} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className={`select-autocomplete-btn select-autocomplete-toggle${isOpen ? ' select-autocomplete-toggle--open' : ''}`}
            aria-label={isOpen ? 'Fermer la liste' : 'Ouvrir la liste'}
            tabIndex={-1}
            onMouseDown={handleToggleDropdown}
          >
            <span className={fr.cx('fr-icon-arrow-down-s-line')} aria-hidden="true" />
          </button>
        </div>
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <ul
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          className={`${fr.cx('fr-p-0', 'fr-m-0')} select-autocomplete-listbox`}
          style={listboxTop !== undefined ? { top: listboxTop } : undefined}
        >
          {filteredOptions.map((option, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={() => selectOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  backgroundColor: isHighlighted ? 'var(--background-alt-blue-france)' : 'transparent',
                  color: 'var(--text-default-grey)',
                }}
              >
                {option.render ?? option.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
