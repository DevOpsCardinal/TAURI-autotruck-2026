import { Archive, PackageCheck, RefreshCw, Scale, Truck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { ApiUnauthorizedError } from '../../operation/api/api.config';
import type { ApiAuth } from '../../operation/types/operation.types';
import { fetchSummary } from '../api/reports.api';
import { ReportsLayout } from '../components/ReportsLayout/ReportsLayout';
import { SummaryCard } from '../components/SummaryCard/SummaryCard';
import { StatusBadge } from '../components/ReportTable/ReportTable';
import type { SummaryResponse, UltimoMovimiento } from '../types/reports.types';
import { formatWeight } from '../utils/reports.utils';
import styles from './SummaryPage.module.css';

function formatMovementTime(fechaHora: string | null | undefined): string {
  if (!fechaHora) return '—';
  const parts = fechaHora.split(' ');
  const time = parts[1] ?? parts[0];
  return time?.slice(0, 5) ?? '—';
}

function MovementRow({ item }: { item: UltimoMovimiento }) {
  const tiqueteLabel = item.no_tiquete != null ? `#${item.no_tiquete}` : '—';
  const isTransit = item.estado === 'EN_TRANSITO';

  return (
    <li className={styles.movementItem}>
      <span className={`${styles.dot} ${isTransit ? styles.dotTransit : ''}`} aria-hidden />
      <span className={styles.movementTime}>{formatMovementTime(item.fecha_hora)}</span>
      <span className={styles.movementType}>{item.tipo}</span>
      <span>{tiqueteLabel}</span>
      <span>{item.placa}</span>
      <span>{item.contraparte ?? '—'}</span>
      <span className={styles.movementNeto}>
        {isTransit ? 'EN TRÁNSITO' : `${formatWeight(item.neto)} kg`}
      </span>
      <StatusBadge estado={item.estado} />
    </li>
  );
}

export function SummaryPage() {
  const navigate = useNavigate();
  const { auth, accessToken } = useAuth();
  const apiAuth = useMemo<ApiAuth | null>(
    () => (accessToken ? { token: accessToken } : null),
    [accessToken],
  );

  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiAuth) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSummary(apiAuth);
      setData(result);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        navigate('/login', { replace: true });
        return;
      }
      setError('No se pudo cargar el resumen del día.');
    } finally {
      setLoading(false);
    }
  }, [apiAuth, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  if (!auth || !apiAuth) return null;

  return (
    <ReportsLayout
      title={`Resumen del día — ${data?.fecha ?? '…'}`}
      headerAction={(
        <button type="button" className={styles.refreshButton} onClick={load} disabled={loading}>
          <RefreshCw size={16} aria-hidden />
          Actualizar
        </button>
      )}
    >
      <div className={styles.summaryPage}>
        {error ? (
          <p className={styles.loadingText}>{error}</p>
        ) : loading && !data ? (
          <p className={styles.loadingText}>Cargando resumen…</p>
        ) : data ? (
          <>
            <div className={styles.kpiGrid}>
              <SummaryCard
                title="Ingresos hoy"
                label="operaciones"
                value={data.ingresos_hoy}
                icon={Archive}
              />
              <SummaryCard
                title="Despachos hoy"
                label="operaciones"
                value={data.despachos_hoy}
                icon={PackageCheck}
              />
              <SummaryCard
                title="Neto entrada"
                label="total del día"
                value={data.neto_entrada_hoy}
                unit="kg"
                icon={Scale}
              />
              <SummaryCard
                title="Neto salida"
                label="total del día"
                value={data.neto_salida_hoy}
                unit="kg"
                icon={Scale}
              />
              <SummaryCard
                title="Activos"
                label="vehíc."
                value={data.vehiculos_activos}
                icon={Truck}
              />
            </div>

            <div className={styles.movementsCard}>
              <h2 className={styles.movementsTitle}>Últimos movimientos</h2>
              <ul className={styles.movementList}>
                {data.ultimos_movimientos.map((item, idx) => (
                  <MovementRow key={`${item.placa}-${item.fecha_hora}-${idx}`} item={item} />
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </div>
    </ReportsLayout>
  );
}
