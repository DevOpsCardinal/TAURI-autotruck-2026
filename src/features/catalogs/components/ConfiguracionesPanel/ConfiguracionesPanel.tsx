import { Check, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ApiAuth, ApiResponseError } from '../../../operation/types/operation.types';
import { updateConfiguracion } from '../../../settings/api/settings.api';
import { fetchCatalogRecords } from '../../api/catalogs-read.api';
import { CatalogRecord } from '../../types/catalog.types';
import styles from './ConfiguracionesPanel.module.css';

const AUTO_MANAGED_PARAMS = new Set(['No_Tiquete_Ingresos', 'No_Tiquete_Despachos']);

const ADMIN_ONLY_PARAMS = new Set([
  'regla_peso_minimo_activa',
  'regla_peso_salida_minimo_activa',
]);

interface ConfigRowState {
  valor: string;
  saved: boolean;
  error: string | null;
  saving: boolean;
}

interface ConfiguracionesPanelProps {
  auth: ApiAuth;
  isAdmin: boolean;
}

export function ConfiguracionesPanel({ auth, isAdmin }: ConfiguracionesPanelProps) {
  const [records, setRecords] = useState<CatalogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowState, setRowState] = useState<Record<string, ConfigRowState>>({});

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCatalogRecords(auth, 'configuraciones');
      setRecords(data);
      const initial: Record<string, ConfigRowState> = {};
      for (const item of data) {
        const parametro = String(item.parametro);
        initial[parametro] = {
          valor: String(item.valor ?? ''),
          saved: false,
          error: null,
          saving: false,
        };
      }
      setRowState(initial);
    } catch {
      setError('No se pudieron cargar las configuraciones.');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  function isEditable(parametro: string): boolean {
    if (AUTO_MANAGED_PARAMS.has(parametro)) return false;
    if (ADMIN_ONLY_PARAMS.has(parametro)) return isAdmin;
    return isAdmin;
  }

  async function handleSave(parametro: string, originalValor: string) {
    const current = rowState[parametro];
    if (!current || current.valor === originalValor) return;

    setRowState((prev) => ({
      ...prev,
      [parametro]: { ...prev[parametro], saving: true, saved: false, error: null },
    }));

    try {
      await updateConfiguracion(auth.token, parametro, current.valor);
      setRowState((prev) => ({
        ...prev,
        [parametro]: { ...prev[parametro], saving: false, saved: true, error: null },
      }));
      window.setTimeout(() => {
        setRowState((prev) => ({
          ...prev,
          [parametro]: { ...prev[parametro], saved: false },
        }));
      }, 2000);
    } catch (err) {
      const message = err instanceof ApiResponseError
        ? err.message
        : 'No se pudo guardar el parámetro.';
      setRowState((prev) => ({
        ...prev,
        [parametro]: {
          ...prev[parametro],
          saving: false,
          saved: false,
          error: message,
          valor: originalValor,
        },
      }));
    }
  }

  if (loading) {
    return <div className={styles.stateMessage}>Cargando configuraciones...</div>;
  }

  if (error) {
    return (
      <div className={styles.stateMessage}>
        {error}
        <button type="button" className={styles.retryButton} onClick={() => void loadRecords()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {records.map((record) => {
        const parametro = String(record.parametro);
        const descripcion = record.descripcion;
        const state = rowState[parametro];
        const editable = isEditable(parametro);
        const isAuto = AUTO_MANAGED_PARAMS.has(parametro);

        return (
          <div key={parametro} className={styles.configRow}>
            <div className={styles.configInfo}>
              <span className={styles.configKey}>{parametro}</span>
              <span className={styles.configDesc}>
                {descripcion ? String(descripcion) : '—'}
              </span>
              {isAuto && <span className={styles.autoBadge}>Automático</span>}
            </div>
            <div className={styles.configInputWrap}>
              <input
                className={styles.configInput}
                value={state?.valor ?? ''}
                disabled={!editable || state?.saving}
                onChange={(event) => {
                  const nextValor = event.target.value;
                  setRowState((prev) => ({
                    ...prev,
                    [parametro]: {
                      ...prev[parametro],
                      valor: nextValor,
                      saved: false,
                      error: null,
                    },
                  }));
                }}
                onBlur={() => void handleSave(parametro, String(record.valor ?? ''))}
              />
              {state?.saved && <Check size={14} className={styles.iconSuccess} aria-hidden />}
              {state?.error && <X size={14} className={styles.iconError} aria-hidden />}
            </div>
            {isAuto && (
              <span className={styles.autoHint}>Gestionado automáticamente por el sistema</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
