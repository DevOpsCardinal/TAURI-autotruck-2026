import { useCallback, useEffect, useState } from 'react';
import { ApiAuth } from '../../../operation/types/operation.types';
import { EmpresaSection } from '../../../settings/components/EmpresaSection/EmpresaSection';
import { fetchCatalogRecords } from '../../api/catalogs-read.api';
import { CatalogRecord } from '../../types/catalog.types';
import styles from './ConfiguracionesPanel.module.css';

const TICKET_PARAMS = new Set(['No_Tiquete_Ingresos', 'No_Tiquete_Despachos']);

interface ConfiguracionesPanelProps {
  auth: ApiAuth;
  isAdmin: boolean;
}

export function ConfiguracionesPanel({ auth }: ConfiguracionesPanelProps) {
  const [records, setRecords] = useState<CatalogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCatalogRecords(auth, 'configuraciones');
      setRecords(data.filter((r) => TICKET_PARAMS.has(String(r.parametro))));
    } catch {
      setError('No se pudieron cargar los números de tiquete.');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  return (
    <div className={styles.panelWrapper}>
      <EmpresaSection />

      <section className={styles.ticketSection} aria-labelledby="ticket-section-title">
        <h2 id="ticket-section-title" className={styles.sectionTitle}>
          Numeración de tiquetes
        </h2>
        <div className={styles.separator} />

        {loading && (
          <div className={styles.stateMessage}>Cargando numeración...</div>
        )}

        {!loading && error && (
          <div className={styles.errorBox} role="alert">
            <p>{error}</p>
            <button
              type="button"
              className={styles.retryButton}
              onClick={() => void loadRecords()}
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className={styles.ticketRows}>
            {records.map((record) => {
              const parametro = String(record.parametro);
              const descripcion = record.descripcion;
              const valor = record.valor;

              return (
                <div key={parametro} className={styles.ticketRow}>
                  <div className={styles.ticketInfo}>
                    <span className={styles.ticketLabel}>
                      {descripcion ? String(descripcion) : parametro}
                    </span>
                    <span className={styles.ticketHint}>
                      Gestionado automáticamente por el sistema
                    </span>
                  </div>
                  <div className={styles.ticketValueWrap}>
                    <span className={styles.ticketValue}>{String(valor ?? '—')}</span>
                    <span className={styles.autoBadge}>Automático</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
