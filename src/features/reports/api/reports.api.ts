import { apiFetch, API_URL, parseApiResponse, ApiUnauthorizedError } from '../../operation/api/api.config';
import type { ApiAuth } from '../../operation/types/operation.types';
import type {
  DespachosFilters,
  DespachosResponse,
  DespachoRecord,
  DespachoTicketData,
  IngresosFilters,
  IngresosResponse,
  IngresoRecord,
  IngresoTicketData,
  SummaryResponse,
  TransitFilters,
  TransitHistoryRecord,
  TransitHistoryResponse,
} from '../types/reports.types';

const EXPORT_TIMEOUT_MS = 120_000;

interface ExportDataResponse<T> {
  data: T[];
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

function buildExportQueryString(
  filters: Record<string, string | number | undefined>,
): string {
  const { page: _page, limit: _limit, ...rest } = filters;
  return buildQueryString({ ...rest, export: 1 });
}

async function apiFetchExport(path: string, token: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), EXPORT_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      throw new ApiUnauthorizedError();
    }

    return response;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function fetchIngresos(
  auth: ApiAuth,
  filters: IngresosFilters,
): Promise<IngresosResponse> {
  const qs = buildQueryString(filters as Record<string, string | number | undefined>);
  const response = await apiFetch(`/api/reports/ingresos${qs}`, auth.token);
  return parseApiResponse<IngresosResponse>(response);
}

export async function fetchIngresoTicket(
  auth: ApiAuth,
  noTiquete: number,
): Promise<IngresoTicketData> {
  const response = await apiFetch(`/api/reports/ingresos/${noTiquete}/ticket`, auth.token);
  return parseApiResponse<IngresoTicketData>(response);
}

export async function fetchDespachos(
  auth: ApiAuth,
  filters: DespachosFilters,
): Promise<DespachosResponse> {
  const qs = buildQueryString(filters as Record<string, string | number | undefined>);
  const response = await apiFetch(`/api/reports/despachos${qs}`, auth.token);
  return parseApiResponse<DespachosResponse>(response);
}

export async function fetchDespachoTicket(
  auth: ApiAuth,
  noTiquete: number,
): Promise<DespachoTicketData> {
  const response = await apiFetch(`/api/reports/despachos/${noTiquete}/ticket`, auth.token);
  return parseApiResponse<DespachoTicketData>(response);
}

export async function fetchTransitHistory(
  auth: ApiAuth,
  filters: TransitFilters,
): Promise<TransitHistoryResponse> {
  const qs = buildQueryString(filters as Record<string, string | number | undefined>);
  const response = await apiFetch(`/api/reports/transit${qs}`, auth.token);
  return parseApiResponse<TransitHistoryResponse>(response);
}

export async function fetchSummary(auth: ApiAuth): Promise<SummaryResponse> {
  const response = await apiFetch('/api/reports/summary', auth.token);
  return parseApiResponse<SummaryResponse>(response);
}

export async function fetchOperarios(auth: ApiAuth): Promise<string[]> {
  const response = await apiFetch('/api/reports/operarios', auth.token);
  return parseApiResponse<string[]>(response);
}

export async function fetchIngresosExport(
  auth: ApiAuth,
  filters: IngresosFilters,
): Promise<IngresoRecord[]> {
  const qs = buildExportQueryString(filters as Record<string, string | number | undefined>);
  const response = await apiFetchExport(`/api/reports/ingresos${qs}`, auth.token);
  const body = await parseApiResponse<ExportDataResponse<IngresoRecord>>(response);
  return body.data;
}

export async function fetchDespachosExport(
  auth: ApiAuth,
  filters: DespachosFilters,
): Promise<DespachoRecord[]> {
  const qs = buildExportQueryString(filters as Record<string, string | number | undefined>);
  const response = await apiFetchExport(`/api/reports/despachos${qs}`, auth.token);
  const body = await parseApiResponse<ExportDataResponse<DespachoRecord>>(response);
  return body.data;
}

export async function fetchTransitExport(
  auth: ApiAuth,
  filters: TransitFilters,
): Promise<TransitHistoryRecord[]> {
  const qs = buildExportQueryString(filters as Record<string, string | number | undefined>);
  const response = await apiFetchExport(`/api/reports/transit${qs}`, auth.token);
  const body = await parseApiResponse<ExportDataResponse<TransitHistoryRecord>>(response);
  return body.data;
}
