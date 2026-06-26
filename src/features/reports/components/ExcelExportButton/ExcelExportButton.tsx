import { Download, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import type { ApiAuth } from '../../../operation/types/operation.types';
import { useToast } from '../../../operation/components/Toast/ToastContext';
import {
  useExcelExport,
  type ExcelReportType,
} from '../../hooks/useExcelExport';
import type {
  DespachosFilters,
  IngresosFilters,
  TransitFilters,
} from '../../types/reports.types';
import styles from './ExcelExportButton.module.css';

interface ExcelExportButtonProps {
  reportType: ExcelReportType;
  filters: IngresosFilters | DespachosFilters | TransitFilters;
  auth: ApiAuth;
  totalCount?: number;
  disabled?: boolean;
}

export function ExcelExportButton({
  reportType,
  filters,
  auth,
  totalCount,
  disabled = false,
}: ExcelExportButtonProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const onUnauthorized = useCallback(
    () => navigate('/login', { replace: true }),
    [navigate],
  );

  const onToast = useCallback(
    (type: 'success' | 'error', message: string) => showToast(type, message),
    [showToast],
  );

  const { download, isLoading } = useExcelExport(
    reportType,
    filters,
    auth,
    onUnauthorized,
    onToast,
  );

  const countLabel = totalCount != null
    ? `${totalCount.toLocaleString('es-CO')} registro${totalCount === 1 ? '' : 's'} a exportar`
    : 'Exportar todos los registros filtrados';

  return (
    <div className={styles.bar}>
      <span className={styles.meta}>{countLabel}</span>
      <button
        type="button"
        className={styles.button}
        onClick={() => { void download(); }}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <Loader2 size={16} className={styles.spinner} aria-hidden />
        ) : (
          <Download size={16} aria-hidden />
        )}
        {isLoading ? 'Generando Excel…' : 'Descargar Excel'}
      </button>
    </div>
  );
}
