import { useMemo, useState } from 'react';
import { AlertTriangle, Search, X } from 'lucide-react';
import { TransitRecord } from '../../types/operation.types';
import { formatElapsedTime, getElapsedHours } from '../../utils/transit.utils';
import styles from './TransitListPanel.module.css';

interface TransitListPanelProps {
  isOpen: boolean;
  records: TransitRecord[];
  isLoading: boolean;
  selectedRecordId: number | null;
  onClose: () => void;
  onSelectRecord: (record: TransitRecord) => void;
}

type CasoFilter = 'Todos' | 'Ingreso' | 'Despacho';

const numberFormat = new Intl.NumberFormat('es-CO');

function getTimeClass(hours: number): string {
  if (hours >= 24) return styles.timeDanger;
  if (hours >= 8) return styles.timeWarning;
  return '';
}

export function TransitListPanel({
  isOpen,
  records,
  isLoading,
  selectedRecordId,
  onClose,
  onSelectRecord,
}: TransitListPanelProps) {
  const [filter, setFilter] = useState<CasoFilter>('Todos');
  const [localSearch, setLocalSearch] = useState('');

  const filtered = useMemo(() => {
    let list = [...records];
    if (filter !== 'Todos') {
      list = list.filter((r) => r.caso === filter);
    }
    if (localSearch.trim()) {
      const q = localSearch.trim().toUpperCase();
      list = list.filter(
        (r) =>
          r.placa.toUpperCase().includes(q) ||
          r.conductor.toUpperCase().includes(q),
      );
    }
    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [records, filter, localSearch]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Vehículos en tránsito">
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>Vehículos en Tránsito</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <Search size={14} className={styles.searchIcon} aria-hidden />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar placa o conductor..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value.toUpperCase())}
            />
          </div>
          <div className={styles.filters} role="radiogroup" aria-label="Filtrar por tipo">
            {(['Todos', 'Ingreso', 'Despacho'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={filter === option}
                className={`${styles.filterButton} ${filter === option ? styles.filterActive : ''}`}
                onClick={() => setFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.tableWrapper}>
          {isLoading ? (
            <p className={styles.status}>Cargando vehículos...</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Tipo</th>
                  <th>Conductor</th>
                  <th>Peso</th>
                  <th>Planta</th>
                  <th>Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => {
                  const hours = getElapsedHours(record.created_at);
                  const firstWeight = record.caso === 'Ingreso' ? record.bruto : record.tara;
                  return (
                    <tr
                      key={record.id}
                      className={`${styles.row} ${
                        selectedRecordId === record.id ? styles.rowSelected : ''
                      }`}
                      onClick={() => onSelectRecord(record)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSelectRecord(record);
                      }}
                    >
                      <td>{record.placa}</td>
                      <td>
                        <span
                          className={`${styles.chip} ${
                            record.caso === 'Ingreso' ? styles.chipIngreso : styles.chipDespacho
                          }`}
                        >
                          {record.caso}
                        </span>
                      </td>
                      <td>{record.conductor}</td>
                      <td>{numberFormat.format(firstWeight)} kg</td>
                      <td>{record.planta}</td>
                      <td className={getTimeClass(hours)}>
                        {hours >= 24 && <AlertTriangle size={12} aria-hidden />}
                        {formatElapsedTime(record.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!isLoading && filtered.length === 0 && (
            <p className={styles.status}>No hay vehículos en tránsito</p>
          )}
        </div>

        <footer className={styles.footer}>
          {filtered.length} vehículo{filtered.length !== 1 ? 's' : ''} en tránsito
        </footer>
      </div>
    </div>
  );
}
