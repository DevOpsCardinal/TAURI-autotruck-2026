import { apiFetch, parseApiResponse } from '../../operation/api/api.config';

export interface ConfiguracionItem {
  parametro: string;
  valor: string;
  descripcion: string | null;
}

export interface BusinessRule {
  parametro: string;
  nombre: string;
  descripcion: string;
  activa: boolean;
  cargando: boolean;
}

interface ConfiguracionesResponse {
  data: ConfiguracionItem[];
}

interface UpdateConfiguracionResponse {
  parametro: string;
  valor: string;
  actualizado_en: string;
}

export async function fetchConfiguraciones(token: string): Promise<ConfiguracionItem[]> {
  const response = await apiFetch('/api/configuraciones', token);
  const body = await parseApiResponse<ConfiguracionesResponse>(response);
  return body.data;
}

export async function updateConfiguracion(
  token: string,
  parametro: string,
  valor: string,
): Promise<UpdateConfiguracionResponse> {
  const response = await apiFetch(`/api/configuraciones/${encodeURIComponent(parametro)}`, token, {
    method: 'PUT',
    body: JSON.stringify({ valor }),
  });
  return parseApiResponse<UpdateConfiguracionResponse>(response);
}

export interface TestIndicadorConnectionRequest {
  host: string;
  port: number;
  timeout: number;
}

export interface TestIndicadorConnectionResponse {
  success: boolean;
  message: string;
}

export async function testIndicadorConnection(
  token: string,
  body: TestIndicadorConnectionRequest,
): Promise<TestIndicadorConnectionResponse> {
  const response = await apiFetch('/api/configuraciones/indicador/test-connection', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseApiResponse<TestIndicadorConnectionResponse>(response);
}
