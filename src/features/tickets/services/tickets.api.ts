import { apiFetch, parseApiResponse } from '../../operation/api/api.config';
import type { ApiAuth } from '../../operation/types/operation.types';
import type { TicketData } from '../types/ticket.types';

export async function fetchIngresoTicketData(auth: ApiAuth, noTiquete: number): Promise<TicketData> {
  const res = await apiFetch(`/api/reports/ingresos/${noTiquete}/ticket-data`, auth.token);
  return parseApiResponse<TicketData>(res);
}

export async function fetchDespachoTicketData(auth: ApiAuth, noTiquete: number): Promise<TicketData> {
  const res = await apiFetch(`/api/reports/despachos/${noTiquete}/ticket-data`, auth.token);
  return parseApiResponse<TicketData>(res);
}
