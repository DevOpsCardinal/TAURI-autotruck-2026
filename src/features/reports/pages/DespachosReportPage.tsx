import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { ApiUnauthorizedError } from '../../operation/api/api.config';
import { useToast } from '../../operation/components/Toast/ToastContext';
import type { ApiAuth } from '../../operation/types/operation.types';
import { fetchDespachos } from '../api/reports.api';
import { ExcelExportButton } from '../components/ExcelExportButton/ExcelExportButton';
import { ReportDetailPanel } from '../components/ReportDetailPanel/ReportDetailPanel';
import { ReportFilters } from '../components/ReportFilters/ReportFilters';
import { ReportsLayout } from '../components/ReportsLayout/ReportsLayout';
import { ColumnDef, ReportTable } from '../components/ReportTable/ReportTable';
import { TicketPreview } from '../../tickets/components/TicketPreview/TicketPreview';
import { useTicket } from '../../tickets/hooks/useTicket';
import {
  DEFAULT_DESPACHOS,
  useDespachosFiltersFromUrl,
  useDespachosOptions,
} from '../hooks/useReports';
import type { DespachoRecord, DespachosResponse } from '../types/reports.types';
import { hasActiveFilters, formatTime, formatWeight, truncateText } from '../utils/reports.utils';
import styles from './ReportPages.module.css';

const columns: ColumnDef<DespachoRecord>[] = [
  { key: 'no_tiquete', label: 'Tiquete', width: '90px', align: 'center', render: (r) => r.no_tiquete },
  { key: 'fecha', label: 'Fecha', width: '110px', align: 'center', render: (r) => r.fecha_peso_lleno ?? '—' },
  { key: 'hora', label: 'Hora', width: '80px', align: 'center', render: (r) => formatTime(r.hora_peso_lleno) },
  { key: 'placa', label: 'Placa', width: '90px', align: 'center', render: (r) => r.placa?.toUpperCase() ?? '—' },
  {
    key: 'conductor',
    label: 'Conductor',
    width: '150px',
    className: styles.truncate,
    render: (r) => (
      <span title={r.conductor ?? undefined}>{truncateText(r.conductor, 20)}</span>
    ),
  },
  {
    key: 'producto',
    label: 'Producto',
    width: '150px',
    className: styles.truncate,
    render: (r) => (
      <span title={r.producto ?? undefined}>{truncateText(r.producto, 20)}</span>
    ),
  },
  {
    key: 'cliente',
    label: 'Cliente',
    width: '150px',
    className: styles.truncate,
    render: (r) => (
      <span title={r.cliente ?? undefined}>{truncateText(r.cliente, 20)}</span>
    ),
  },
  {
    key: 'destino',
    label: 'Destino',
    width: '120px',
    className: styles.truncate,
    render: (r) => (
      <span title={r.destino ?? undefined}>{truncateText(r.destino, 20)}</span>
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
    key: 'bruto',
    label: 'Bruto (kg)',
    width: '100px',
    align: 'right',
    className: styles.numeric,
    render: (r) => formatWeight(r.bruto),
  },
  {
    key: 'tara',
    label: 'Tara (kg)',
    width: '100px',
    align: 'right',
    className: styles.numeric,
    render: (r) => formatWeight(r.tara),
  },
  {
    key: 'neto',
    label: 'Neto (kg)',
    width: '110px',
    align: 'right',
    className: styles.numericBold,
    render: (r) => formatWeight(r.neto),
  },
  { key: 'operario', label: 'Operario', width: '100px', render: (r) => r.nick_operario ?? '—' },
];

export function DespachosReportPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { auth, accessToken } = useAuth();
  const apiAuth = useMemo<ApiAuth | null>(
    () => (accessToken ? { token: accessToken } : null),
    [accessToken],
  );
  const options = useDespachosOptions(apiAuth);
  const [filters, setFilters] = useDespachosFiltersFromUrl();

  const [response, setResponse] = useState<DespachosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DespachoRecord | null>(null);
  const ticket = useTicket(apiAuth);

  const dateInvalid = Boolean(
    filters.fecha_desde && filters.fecha_hasta && filters.fecha_desde > filters.fecha_hasta,
  );

  const load = useCallback(async () => {
    if (!apiAuth || dateInvalid) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDespachos(apiAuth, filters);
      setResponse(result);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        navigate('/login', { replace: true });
        return;
      }
      setError('No se pudo cargar el historial de despachos.');
    } finally {
      setLoading(false);
    }
  }, [apiAuth, filters, dateInvalid, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePrint() {
    if (!selected?.no_tiquete) return;
    try {
      await ticket.openForReprint('Despacho', selected.no_tiquete);
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
    <ReportsLayout title="Despachos">
      <ReportFilters
        type="despachos"
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_DESPACHOS)}
        options={options}
      />

      <ReportTable
        columns={columns}
        data={response?.data ?? []}
        loading={loading}
        selectedId={selected?.id}
        onRowClick={setSelected}
        emptyMessage="Aún no hay registros de despachos."
        emptyWithFiltersMessage="No se encontraron despachos con los filtros aplicados."
        errorMessage={error ?? undefined}
        hasActiveFilters={activeFilters}
        onRetry={load}
        onClearFilters={() => setFilters(DEFAULT_DESPACHOS)}
        summary={response?.summary}
        infoBar={(
          <ExcelExportButton
            reportType="despachos"
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
        type={selected ? 'despacho' : null}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onPrint={handlePrint}
        printing={ticket.loading}
        canPrint={selected?.no_tiquete != null}
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
