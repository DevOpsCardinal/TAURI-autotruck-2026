import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { ApiUnauthorizedError } from '../../operation/api/api.config';
import { useToast } from '../../operation/components/Toast/ToastContext';
import type { ApiAuth } from '../../operation/types/operation.types';
import {
  fetchTransitHistory,
} from '../api/reports.api';
import { ExcelExportButton } from '../components/ExcelExportButton/ExcelExportButton';
import { ReportDetailPanel } from '../components/ReportDetailPanel/ReportDetailPanel';
import { ReportFilters } from '../components/ReportFilters/ReportFilters';
import { ReportsLayout } from '../components/ReportsLayout/ReportsLayout';
import { ColumnDef, ReportTable, StatusBadge } from '../components/ReportTable/ReportTable';
import { TicketPreview } from '../../tickets/components/TicketPreview/TicketPreview';
import { useTicket } from '../../tickets/hooks/useTicket';
import {
  DEFAULT_TRANSIT,
  useTransitFiltersFromUrl,
  useTransitOptions,
} from '../hooks/useReports';
import type { TransitHistoryRecord, TransitHistoryResponse } from '../types/reports.types';
import { hasActiveFilters, displayValue, formatWeight, truncateText } from '../utils/reports.utils';
import styles from './ReportPages.module.css';

function formatCreatedAt(createdAt: string | null): { fecha: string; hora: string } {
  if (!createdAt) return { fecha: '—', hora: '—' };
  const [fecha, hora] = createdAt.split(' ');
  return { fecha: fecha ?? '—', hora: hora?.slice(0, 5) ?? '—' };
}

const columns: ColumnDef<TransitHistoryRecord>[] = [
  { key: 'no_interno', label: 'No. Interno', width: '100px', render: (r) => r.no_interno ?? '—' },
  {
    key: 'fecha',
    label: 'Fecha',
    width: '110px',
    align: 'center',
    render: (r) => formatCreatedAt(r.created_at).fecha,
  },
  {
    key: 'hora',
    label: 'Hora',
    width: '80px',
    align: 'center',
    render: (r) => formatCreatedAt(r.created_at).hora,
  },
  { key: 'placa', label: 'Placa', width: '90px', align: 'center', render: (r) => r.placa?.toUpperCase() },
  { key: 'caso', label: 'Tipo', width: '90px', render: (r) => r.caso },
  {
    key: 'mercancia',
    label: 'Mercancía',
    width: '160px',
    className: styles.truncate,
    render: (r) => (
      <span title={r.materia_prima_producto ?? undefined}>
        {truncateText(r.materia_prima_producto, 20)}
      </span>
    ),
  },
  {
    key: 'contraparte',
    label: 'Contraparte',
    width: '160px',
    className: styles.truncate,
    render: (r) => (
      <span title={r.cliente_proveedor ?? undefined}>
        {truncateText(r.cliente_proveedor, 20)}
      </span>
    ),
  },
  {
    key: 'planta',
    label: 'Planta',
    width: '120px',
    className: styles.truncate,
    render: (r) => (
      <span title={r.planta ?? undefined}>{truncateText(r.planta, 15)}</span>
    ),
  },
  {
    key: 'estado',
    label: 'Estado',
    width: '120px',
    render: (r) => <StatusBadge estado={r.estado} />,
  },
  {
    key: 'neto',
    label: 'Neto (kg)',
    width: '100px',
    align: 'right',
    className: styles.numeric,
    render: (r) => formatWeight(r.neto),
  },
  {
    key: 'completado_en',
    label: 'Completado en',
    width: '140px',
    render: (r) => displayValue(r.completado_en),
  },
];

export function TransitHistoryPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { auth, accessToken } = useAuth();
  const apiAuth = useMemo<ApiAuth | null>(
    () => (accessToken ? { token: accessToken } : null),
    [accessToken],
  );
  const options = useTransitOptions(apiAuth);
  const [filters, setFilters] = useTransitFiltersFromUrl();

  const [response, setResponse] = useState<TransitHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TransitHistoryRecord | null>(null);
  const ticket = useTicket(apiAuth);

  const dateInvalid = Boolean(
    filters.fecha_desde && filters.fecha_hasta && filters.fecha_desde > filters.fecha_hasta,
  );

  const load = useCallback(async () => {
    if (!apiAuth || dateInvalid) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTransitHistory(apiAuth, filters);
      setResponse(result);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        navigate('/login', { replace: true });
        return;
      }
      setError('No se pudo cargar el historial de tránsito.');
    } finally {
      setLoading(false);
    }
  }, [apiAuth, filters, dateInvalid, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePrint() {
    if (!selected?.no_tiquete || !selected.caso) return;
    try {
      await ticket.openForReprint(selected.caso, selected.no_tiquete);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        navigate('/login', { replace: true });
        return;
      }
      showToast('error', 'No se pudo obtener el tiquete para reimprimir.');
    }
  }

  if (!auth || !apiAuth) return null;

  const pagination = response?.pagination;
  const activeFilters = hasActiveFilters(filters as unknown as Record<string, string | number>);

  return (
    <ReportsLayout title="Historial de Tránsito">
      <ReportFilters
        type="transit"
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_TRANSIT)}
        options={options}
      />

      <ReportTable
        columns={columns}
        data={response?.data ?? []}
        loading={loading}
        selectedId={selected?.id}
        onRowClick={setSelected}
        emptyMessage="Aún no hay registros de tránsito."
        emptyWithFiltersMessage="No se encontraron registros con los filtros aplicados."
        errorMessage={error ?? undefined}
        hasActiveFilters={activeFilters}
        onRetry={load}
        onClearFilters={() => setFilters(DEFAULT_TRANSIT)}
        infoBar={(
          <ExcelExportButton
            reportType="transit"
            filters={filters}
            auth={apiAuth}
            totalCount={pagination?.total}
            disabled={loading || dateInvalid}
          />
        )}
        pagination={pagination ? {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          total_pages: pagination.total_pages,
          onPageChange: (page) => setFilters({ ...filters, page }),
          onLimitChange: (limit) => setFilters({ ...filters, limit, page: 1 }),
        } : undefined}
      />

      <ReportDetailPanel
        record={selected}
        type={selected ? 'transit' : null}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onPrint={handlePrint}
        printing={ticket.loading}
        canPrint={selected?.estado === 'COMPLETADO' && selected?.no_tiquete != null}
      />

      <TicketPreview
        open={ticket.open}
        ticketData={ticket.ticketData}
        format={ticket.format}
        loading={ticket.loading}
        error={ticket.error}
        onClose={ticket.close}
        onFormatChange={ticket.setFormat}
        onPrint={ticket.print}
      />
    </ReportsLayout>
  );
}
