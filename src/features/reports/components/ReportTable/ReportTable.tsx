import type { ReactNode } from 'react';
import styles from './ReportTable.module.css';

export type ColumnAlign = 'left' | 'center' | 'right';

export interface ColumnDef<T> {
  key: string;
  label: string;
  width?: string;
  align?: ColumnAlign;
  render: (row: T) => ReactNode;
  className?: string;
}

interface ReportTableProps<T extends { id: number }> {
  columns: ColumnDef<T>[];
  data: T[];
  loading: boolean;
  selectedId?: number | null;
  onRowClick: (row: T) => void;
  emptyMessage?: string;
  emptyWithFiltersMessage?: string;
  errorMessage?: string;
  hasActiveFilters?: boolean;
  onRetry?: () => void;
  onClearFilters?: () => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
  };
  summary?: {
    total_bruto: number;
    total_tara: number;
    total_neto: number;
  };
  infoBar?: ReactNode;
}

const SKELETON_ROWS = 5;

function alignClass(align?: ColumnAlign): string {
  if (align === 'center') return styles.alignCenter;
  if (align === 'right') return styles.alignRight;
  return '';
}

export function ReportTable<T extends { id: number }>({
  columns,
  data,
  loading,
  selectedId,
  onRowClick,
  emptyMessage = 'Aún no hay registros.',
  emptyWithFiltersMessage = 'No se encontraron registros con los filtros aplicados.',
  errorMessage,
  hasActiveFilters = false,
  onRetry,
  onClearFilters,
  pagination,
  summary,
  infoBar,
}: ReportTableProps<T>) {
  if (errorMessage) {
    return (
      <div className={styles.tableWrap}>
        <div className={styles.errorState}>
          <p>{errorMessage}</p>
          {onRetry ? (
            <button type="button" className={styles.retryButton} onClick={onRetry}>
              Reintentar
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const showEmpty = !loading && data.length === 0;

  return (
    <div className={styles.tableWrap}>
      {infoBar}

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                  className={alignClass(col.align)}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <tr key={`sk-${i}`} className={styles.skeletonRow}>
                    {columns.map((col) => (
                      <td key={col.key}>
                        <div className={styles.skeletonCell} />
                      </td>
                    ))}
                  </tr>
                ))
              : data.map((row) => (
                  <tr
                    key={row.id}
                    className={`${styles.row} ${selectedId === row.id ? styles.rowSelected : ''}`}
                    onClick={() => onRowClick(row)}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`${alignClass(col.align)} ${col.className ?? ''}`}
                        title={typeof col.render(row) === 'string' ? String(col.render(row)) : undefined}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {showEmpty ? (
        <div className={styles.emptyState}>
          <p>{hasActiveFilters ? emptyWithFiltersMessage : emptyMessage}</p>
          {hasActiveFilters && onClearFilters ? (
            <button type="button" className={styles.retryButton} onClick={onClearFilters}>
              Limpiar filtros
            </button>
          ) : null}
        </div>
      ) : null}

      {summary && !loading && data.length > 0 ? (
        <div className={styles.totalsBar}>
          <span className={styles.totalsLabel}>Totales filtrados</span>
          <span>BRUTO: {new Intl.NumberFormat('es-CO').format(summary.total_bruto)}</span>
          <span>TARA: {new Intl.NumberFormat('es-CO').format(summary.total_tara)}</span>
          <span>NETO: {new Intl.NumberFormat('es-CO').format(summary.total_neto)}</span>
        </div>
      ) : null}

      {pagination && !loading ? (
        <div className={styles.footer}>
          <span>
            Mostrando {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} registros
          </span>
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              ← Anterior
            </button>
            <span>
              Página {pagination.page} de {pagination.total_pages}
            </span>
            <button
              type="button"
              className={styles.pageButton}
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Siguiente →
            </button>
            {pagination.onLimitChange ? (
              <label>
                Items por página:{' '}
                <select
                  value={pagination.limit}
                  onChange={(e) => pagination.onLimitChange?.(Number(e.target.value))}
                >
                  {[20, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StatusBadge({ estado }: { estado: string }) {
  if (estado === 'EN_TRANSITO') {
    return <span className={`${styles.badge} ${styles.badgeTransit}`}>En Tránsito</span>;
  }
  if (estado === 'COMPLETADO') {
    return <span className={`${styles.badge} ${styles.badgeCompleted}`}>Completado</span>;
  }
  if (estado === 'CANCELADO') {
    return <span className={`${styles.badge} ${styles.badgeCancelled}`}>Cancelado</span>;
  }
  return <span className={styles.badge}>{estado}</span>;
}
