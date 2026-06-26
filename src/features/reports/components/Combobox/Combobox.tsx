import { useEffect, useMemo, useRef, useState } from 'react';
import type { FilterOption } from '../../types/reports.types';
import styles from './Combobox.module.css';

interface ComboboxProps {
  id?: string;
  /** Options list — value is the stable identifier (NIT/Codigo), label is the display name. */
  options: FilterOption[];
  /** Currently applied filter value (identifier). */
  value: string;
  placeholder?: string;
  onSelect: (v: string) => void;
}

export function Combobox({ id, options, value, placeholder, onSelect }: ComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // When an option is selected, show its label; otherwise show whatever the user typed.
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? '';

  const [inputText, setInputText] = useState(() => labelFor(value));
  const [open, setOpen] = useState(false);

  // Sync when value or options change externally (e.g., "clear all")
  useEffect(() => {
    setInputText(labelFor(value));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options]);

  // Close on outside click and reset input to selected label
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setInputText(labelFor(value));
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value, options]);

  const filtered = useMemo(() => {
    const q = inputText.trim().toUpperCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toUpperCase().includes(q));
  }, [options, inputText]);

  function handleSelect(opt: FilterOption) {
    setInputText(opt.label);
    setOpen(false);
    onSelect(opt.value);
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setInputText('');
    setOpen(false);
    onSelect('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      setInputText(labelFor(value));
    }
  }

  return (
    <div className={styles.combobox} ref={containerRef}>
      <div className={styles.inputWrap}>
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={inputText}
          placeholder={placeholder}
          className={`${styles.input} ${value ? styles.inputSelected : ''}`}
          onChange={(e) => {
            setInputText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button
            type="button"
            className={styles.clearBtn}
            onMouseDown={handleClear}
            tabIndex={-1}
            aria-label="Limpiar selección"
          >
            ×
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <ul className={styles.dropdown} role="listbox">
          {filtered.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`${styles.option} ${opt.value === value ? styles.optionSelected : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(opt)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}

      {open && filtered.length === 0 && inputText.trim().length > 0 && (
        <div className={styles.noResults}>Sin coincidencias</div>
      )}
    </div>
  );
}
