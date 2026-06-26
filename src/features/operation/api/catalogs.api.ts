import { apiFetch, parseApiResponse } from './api.config';
import {
  ApiAuth,
  Cliente,
  Conductor,
  Destino,
  MateriaPrima,
  Origen,
  Planta,
  Producto,
  Proveedor,
  Transportadora,
} from '../types/operation.types';

export async function getConductores(auth: ApiAuth): Promise<Conductor[]> {
  const response = await apiFetch('/api/conductores', auth.token);
  return parseApiResponse<Conductor[]>(response);
}

export async function getPlantas(auth: ApiAuth): Promise<Planta[]> {
  const response = await apiFetch('/api/plantas', auth.token);
  return parseApiResponse<Planta[]>(response);
}

export async function getProveedores(auth: ApiAuth): Promise<Proveedor[]> {
  const response = await apiFetch('/api/proveedores', auth.token);
  return parseApiResponse<Proveedor[]>(response);
}

export async function getClientes(auth: ApiAuth): Promise<Cliente[]> {
  const response = await apiFetch('/api/clientes', auth.token);
  return parseApiResponse<Cliente[]>(response);
}

export async function getTransportadoras(auth: ApiAuth): Promise<Transportadora[]> {
  const response = await apiFetch('/api/transportadoras', auth.token);
  return parseApiResponse<Transportadora[]>(response);
}

export async function getOrigenes(auth: ApiAuth): Promise<Origen[]> {
  const response = await apiFetch('/api/origenes', auth.token);
  return parseApiResponse<Origen[]>(response);
}

export async function getDestinos(auth: ApiAuth): Promise<Destino[]> {
  const response = await apiFetch('/api/destinos', auth.token);
  return parseApiResponse<Destino[]>(response);
}

export async function getMaterias(auth: ApiAuth): Promise<MateriaPrima[]> {
  const response = await apiFetch('/api/materias', auth.token);
  return parseApiResponse<MateriaPrima[]>(response);
}

export async function getProductos(auth: ApiAuth): Promise<Producto[]> {
  const response = await apiFetch('/api/productos', auth.token);
  return parseApiResponse<Producto[]>(response);
}

export async function getTrama(auth: ApiAuth): Promise<string> {
  const response = await apiFetch('/api/configuraciones/trama', auth.token);
  const data = await parseApiResponse<{ Valor: string }[]>(response);
  return data[0]?.Valor ?? 'Cardinal SMA';
}
