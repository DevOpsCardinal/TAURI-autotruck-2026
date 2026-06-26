import { List, Search } from 'lucide-react';
import { TransitRecord } from '../../types/operation.types';
import { formatElapsedTime, highlightMatch } from '../../utils/transit.utils';
import styles from './VehicleSearch.module.css';

interface VehicleSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: TransitRecord[];
  isLoading: boolean;
  selectedRecordId: number | null;
  onSelectRecord: (record: TransitRecord) => void;
  onOpenList: () => void;
  showDropdown: boolean;
}

const numberFormat = new Intl.NumberFormat('es-CO');

export function VehicleSearch({
  query,
  onQueryChange,
  results,
  isLoading,
  selectedRecordId,
  onSelectRecord,
  onOpenList,
  showDropdown,
}: VehicleSearchProps) {
  const showNoResults = showDropdown && !isLoading && query.length >= 2 && results.length === 0;

  return (
    <section className={styles.container} aria-label="Búsqueda de vehículos en tránsito">
      <div className={styles.searchRow}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} aria-hidden />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar vehículo por placa..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value.toUpperCase())}
            aria-label="Buscar vehículo por placa"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
          />
        </div>
        <button
          type="button"
          className={styles.listButton}
          onClick={onOpenList}
          aria-label="Ver vehículos en tránsito"
        >
          <List size={16} aria-hidden />
          <span>Ver vehículos en tránsito</span>
        </button>
      </div>

      {isLoading && query.length >= 2 && (
        <p className={styles.status}>Buscando...</p>
      )}

      {showDropdown && results.length > 0 && (
        <ul className={styles.dropdown} role="listbox" aria-label="Resultados de búsqueda">
          {results.map((record) => {
            const { before, match, after } = highlightMatch(record.placa, query);
            const firstWeight = record.caso === 'Ingreso' ? record.bruto : record.tara;
            return (
              <li key={record.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedRecordId === record.id}
                  className={`${styles.dropdownItem} ${
                    selectedRecordId === record.id ? styles.dropdownItemSelected : ''
                  }`}
                  onClick={() => onSelectRecord(record)}
                >
                  <span className={styles.colPlaca}>
                    {before}
                    {match && <strong>{match}</strong>}
                    {after}
                  </span>
                  <span
                    className={`${styles.chip} ${
                      record.caso === 'Ingreso' ? styles.chipIngreso : styles.chipDespacho
                    }`}
                  >
                    {record.caso}
                  </span>
                  <span className={styles.colConductor}>{record.conductor}</span>
                  <span className={styles.colTime}>{formatElapsedTime(record.created_at)}</span>
                  <span className={styles.colPeso}>{numberFormat.format(firstWeight)} kg</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showNoResults && (
        <p className={styles.status}>No hay vehículos en tránsito con esa placa</p>
      )}
    </section>
  );
}
