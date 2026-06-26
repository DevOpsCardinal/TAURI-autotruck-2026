import { apiFetch, parseApiResponse } from '../../operation/api/api.config';
import { ApiAuth } from '../../operation/types/operation.types';
import {
  CreateUserPayload,
  Role,
  UpdateUserPayload,
  UserRecord,
  UsersListResponse,
  UserRole,
} from '../types/admin.types';

export interface ListUsersParams {
  q?: string;
  rol?: UserRole[];
  activo?: boolean;
  limit?: number;
  offset?: number;
}

function buildQuery(params: ListUsersParams): string {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.rol) {
    for (const role of params.rol) {
      search.append('rol', role);
    }
  }
  if (params.activo === true) search.set('activo', 'true');
  if (params.activo === false) search.set('activo', 'false');
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function fetchUsers(
  auth: ApiAuth,
  params: ListUsersParams = {},
): Promise<UsersListResponse> {
  const response = await apiFetch(`/api/users${buildQuery(params)}`, auth.token);
  return parseApiResponse<UsersListResponse>(response);
}

export async function fetchUserById(auth: ApiAuth, id: number): Promise<UserRecord> {
  const response = await apiFetch(`/api/users/${id}`, auth.token);
  return parseApiResponse<UserRecord>(response);
}

export async function fetchRoles(auth: ApiAuth): Promise<Role[]> {
  const response = await apiFetch('/api/users/roles', auth.token);
  return parseApiResponse<Role[]>(response);
}

export async function createUser(auth: ApiAuth, payload: CreateUserPayload): Promise<UserRecord> {
  const response = await apiFetch('/api/users', auth.token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return parseApiResponse<UserRecord>(response);
}

export async function updateUser(
  auth: ApiAuth,
  id: number,
  payload: UpdateUserPayload,
): Promise<UserRecord> {
  const response = await apiFetch(`/api/users/${id}`, auth.token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return parseApiResponse<UserRecord>(response);
}

export async function setUserStatus(
  auth: ApiAuth,
  id: number,
  activo: boolean,
): Promise<{ id: number; nick: string; activo: boolean }> {
  const response = await apiFetch(`/api/users/${id}/status`, auth.token, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  });
  return parseApiResponse<{ id: number; nick: string; activo: boolean }>(response);
}

export async function resetUserPassword(
  auth: ApiAuth,
  id: number,
  password: string,
  confirmPassword: string,
): Promise<{ success: boolean; message: string }> {
  const response = await apiFetch(`/api/users/${id}/password`, auth.token, {
    method: 'PATCH',
    body: JSON.stringify({ password, confirmPassword }),
  });
  return parseApiResponse<{ success: boolean; message: string }>(response);
}
