import { Loader2 } from 'lucide-react';
import { OperationMode, TransitRecord } from '../../types/operation.types';
import styles from './ActionBar.module.css';

interface ActionBarProps {
  mode: OperationMode;
  transitRecord: TransitRecord | null;
  isSubmitting: boolean;
}

function getButtonLabel(mode: OperationMode, transitRecord: TransitRecord | null): string {
  if (mode === 'transito' && transitRecord) return 'Registrar Salida';
  return 'Poner en Tránsito';
}

export function ActionBar({ mode, transitRecord, isSubmitting }: ActionBarProps) {
  return (
    <div className={styles.container}>
      <button
        type="submit"
        className={styles.submitButton}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className={`${styles.spinner} opSpinner`} aria-hidden />
            Procesando...
          </>
        ) : (
          getButtonLabel(mode, transitRecord)
        )}
      </button>
    </div>
  );
}
