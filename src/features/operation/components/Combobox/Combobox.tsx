import { AlertCircle, Check, Search, X } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Combobox.module.css';

export interface ComboboxProps<T> {
  name: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  error?: string;
  touched?: boolean;
  loadOptions: () => Promise<T[]>;
  getOptionLabel: (option: T) => string;
  filterOption: (option: T, query: string) => boolean;
  onSelect: (option: T) => void;
  onClear: () => void;
  onBlur?: () => void;
}

interface DropdownPos {
  top: number;
  left: number;
  width: number;
}

export function Combobox<T>({
  name,
  label,
  required,
  disabled,
  value,
  error,
  touched,
  loadOptions,
  getOptionLabel,
  filterOption,
  onSelect,
  onClear,
  onBlur,
}: ComboboxProps<T>) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<T[]>([]);
  const [filtered, setFiltered] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [confirmed, setConfirmed] = useState(Boolean(value));
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);

  useEffect(() => {
    setQuery(value);
    setConfirmed(Boolean(value));
  }, [value]);

  const handleLoad = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const data = await loadOptions();
      setOptions(data);
      setFiltered(data);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [loadOptions, loaded, loading]);

  useEffect(() => {
    if (!open) return;
    const normalized = query.toLowerCase();
    setFiltered(options.filter((option) => filterOption(option, normalized)));
  }, [query, options, filterOption, open]);

  // Compute dropdown position relative to the input wrapper using fixed coords
  useLayoutEffect(() => {
    if (!open && !closing) {
      setDropdownPos(null);
      return;
    }
    if (!inputWrapperRef.current) return;

    function updatePos() {
      if (!inputWrapperRef.current) return;
      const rect = inputWrapperRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }

    updatePos();

    // Reposition when the scrollable ancestor scrolls
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, closing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
        onBlur?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  function closeDropdown() {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 100);
  }

  const showError = Boolean(touched && error);

  // Only pre-load options on focus — do NOT open the dropdown on mere focus
  function handleFocus() {
    if (disabled) return;
    handleLoad();
  }

  function handleSelect(option: T) {
    const labelText = getOptionLabel(option);
    setQuery(labelText);
    setConfirmed(true);
    closeDropdown();
    onSelect(option);
  }

  function handleClear() {
    setQuery('');
    setConfirmed(false);
    setActiveIndex(-1);
    onClear();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (event.key === 'Escape') {
      closeDropdown();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setClosing(false);
      if (!loaded) handleLoad();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0 && filtered[activeIndex]) {
      event.preventDefault();
      handleSelect(filtered[activeIndex]);
    }
  }

  const dropdownVisible = open || closing;

  const dropdownEl = dropdownVisible && dropdownPos ? (
    <ul
      id={listboxId}
      role="listbox"
      className={`${styles.dropdown} ${closing ? styles.dropdownClosing : styles.dropdownOpen}`}
      style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
    >
      {loading && <li className={styles.emptyOption}>Cargando...</li>}
      {!loading && filtered.length === 0 && (
        <li className={styles.emptyOption}>Sin resultados</li>
      )}
      {!loading &&
        filtered.map((option, index) => (
          <li
            key={`${getOptionLabel(option)}-${index}`}
            id={`${listboxId}-option-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            className={`${styles.option} ${index === activeIndex ? styles.optionActive : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect(option);
            }}
          >
            {getOptionLabel(option)}
          </li>
        ))}
    </ul>
  ) : null;

  return (
    <div className={styles.fieldGroup} ref={containerRef}>
      <label className={styles.fieldLabel} htmlFor={name}>
        {label}
        {required && <span className={styles.requiredMark}> *</span>}
      </label>
      <div className={styles.inputWrapper} ref={inputWrapperRef}>
        <span className={styles.leadingIcon} aria-hidden>
          {confirmed && !disabled ? (
            <Check size={12} className={styles.checkIcon} />
          ) : (
            <Search size={13} className={styles.searchIcon} />
          )}
        </span>
        <input
          id={name}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-label={label}
          className={`${styles.input} ${showError ? styles.inputError : ''} ${disabled ? styles.inputDisabled : ''}`}
          value={query}
          disabled={disabled}
          onFocus={handleFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setClosing(false);
            setConfirmed(false);
            if (!loaded) handleLoad();
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (!open) onBlur?.();
          }}
        />
        {query && !disabled && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Limpiar"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {showError && (
        <p className={styles.fieldError}>
          <AlertCircle size={12} aria-hidden />
          {error}
        </p>
      )}
      {dropdownEl && createPortal(dropdownEl, document.body)}
    </div>
  );
}
