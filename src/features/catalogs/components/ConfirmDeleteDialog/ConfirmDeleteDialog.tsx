import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiAuth, ApiResponseError } from '../../../operation/types/operation.types';
import { deleteRecord } from '../../api/catalogs-crud.api';
import { CatalogKey, CatalogRecord } from '../../types/catalog.types';
import styles from './ConfirmDeleteDialog.module.css';

interface ConfirmDeleteDialogProps {
  record: CatalogRecord;
  catalogKey: CatalogKey;
  auth: ApiAuth;
  onConfirm: () => void;
  onCancel: () => void;
}

function getRecordName(record: CatalogRecord): string {
  const nombre = record.Nombre;
  return nombre !== null && nombre !== undefined ? String(nombre) : 'registro';
}

export function ConfirmDeleteDialog({
  record,
  catalogKey,
  auth,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  async function handleDelete() {
    if (blockError) {
      onCancel();
      return;
    }

    setLoading(true);
    try {
      const id = Number(record.id);
      await deleteRecord(auth, catalogKey, id);
      onConfirm();
    } catch (error) {
      if (error instanceof ApiResponseError && error.code === 'DEPENDENCY_CONFLICT') {
        setBlockError(error.message);
      } else if (error instanceof ApiResponseError) {
        setBlockError(error.message);
      } else {
        setBlockError('No se pudo eliminar el registro. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  const recordName = getRecordName(record);

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <div className={styles.modal} role="alertdialog" aria-labelledby="delete-dialog-title">
        <h3 id="delete-dialog-title">¿Eliminar registro?</h3>
        {!blockError ? (
          <p>
            Esta acción no se puede deshacer. El registro «{recordName}» será eliminado permanentemente.
          </p>
        ) : (
          <div className={styles.errorBanner}>{blockError}</div>
        )}
        <div className={styles.actions}>
          {!blockError ? (
            <>
              <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
                Cancelar
              </button>
              <button type="button" className={styles.deleteButton} onClick={handleDelete} disabled={loading}>
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </>
          ) : (
            <button type="button" className={styles.cancelButton} onClick={onCancel}>
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
