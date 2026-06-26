import { apiFetch, parseApiResponse } from './api.config';
import {
  ApiAuth,
  CreateTransitPayload,
  CreateTransitResponse,
  DespachoSalidaPayload,
  IngresoSalidaPayload,
  SalidaResponse,
  TransitListResponse,
  TransitRecord,
} from '../types/operation.types';

export interface TransitSearchParams {
  search?: string;
  caso?: 'Ingreso' | 'Despacho' | '';
  page?: number;
  limit?: number;
}

export async function searchTransitVehicles(
  auth: ApiAuth,
  params: TransitSearchParams = {},
): Promise<TransitListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.caso) query.set('caso', params.caso);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const response = await apiFetch(`/api/transit${qs ? `?${qs}` : ''}`, auth.token);
  return parseApiResponse<TransitListResponse>(response);
}

export async function getTransitByPlaca(
  auth: ApiAuth,
  placa: string,
): Promise<TransitRecord> {
  const response = await apiFetch(
    `/api/transit/${encodeURIComponent(placa)}`,
    auth.token,
  );
  return parseApiResponse<TransitRecord>(response);
}

export async function createTransitRecord(
  auth: ApiAuth,
  payload: CreateTransitPayload,
): Promise<CreateTransitResponse> {
  const response = await apiFetch('/api/transit', auth.token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return parseApiResponse<CreateTransitResponse>(response);
}

export async function registerSalida(
  auth: ApiAuth,
  placa: string,
  payload: IngresoSalidaPayload | DespachoSalidaPayload,
): Promise<SalidaResponse> {
  const response = await apiFetch(
    `/api/transit/${encodeURIComponent(placa)}/salida`,
    auth.token,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return parseApiResponse<SalidaResponse>(response);
}

export async function cancelTransitRecord(
  auth: ApiAuth,
  placa: string,
  motivo: string,
): Promise<{ message: string; placa: string; motivo_cancelacion: string; cancelado_en: string }> {
  const response = await apiFetch(`/api/transit/${encodeURIComponent(placa)}`, auth.token, {
    method: 'DELETE',
    body: JSON.stringify({ motivo_cancelacion: motivo }),
  });
  return parseApiResponse(response);
}
