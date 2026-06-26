import { Pencil, Trash2 } from 'lucide-react';
import { CATALOG_COLUMNS, CatalogKey, CatalogRecord } from '../../types/catalog.types';
import styles from './CatalogTable.module.css';

interface CatalogTableProps {
  catalogKey: CatalogKey;
  records: CatalogRecord[];
  onEdit: (record: CatalogRecord) => void;
  onDelete: (record: CatalogRecord) => void;
  isAdmin: boolean;
}

function formatCellValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function getRecordName(record: CatalogRecord): string {
  const nombre = record.Nombre;
  return nombre !== null && nombre !== undefined ? String(nombre) : 'registro';
}

export function CatalogTable({
  catalogKey,
  records,
  onEdit,
  onDelete,
  isAdmin,
}: CatalogTableProps) {
  const columns = CATALOG_COLUMNS[catalogKey];

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const recordId = record.id;
            return (
              <tr key={String(recordId)}>
                {columns.map((col) => (
                  <td key={col.key}>{formatCellValue(record[col.key] as string | number | null)}</td>
                ))}
                <td className={styles.actionsCell}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => onEdit(record)}
                    disabled={!isAdmin}
                    title={isAdmin ? 'Editar' : 'Solo administradores pueden realizar esta acción'}
                    aria-label={`Editar ${getRecordName(record)}`}
                  >
                    <Pencil size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => onDelete(record)}
                    disabled={!isAdmin}
                    title={isAdmin ? 'Eliminar' : 'Solo administradores pueden realizar esta acción'}
                    aria-label={`Eliminar ${getRecordName(record)}`}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
