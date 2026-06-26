import { apiFetch, parseApiResponse } from '../../operation/api/api.config';
import { ApiAuth } from '../../operation/types/operation.types';
import { CatalogKey, CatalogRecord } from '../types/catalog.types';

export async function createRecord(
  auth: ApiAuth,
  catalogKey: CatalogKey,
  body: Record<string, unknown>,
): Promise<CatalogRecord> {
  const response = await apiFetch(`/api/catalogs/entries/${catalogKey}`, auth.token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseApiResponse<CatalogRecord>(response);
}

export async function updateRecord(
  auth: ApiAuth,
  catalogKey: CatalogKey,
  id: number,
  body: Record<string, unknown>,
): Promise<CatalogRecord> {
  const response = await apiFetch(`/api/catalogs/entries/${catalogKey}/${id}`, auth.token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return parseApiResponse<CatalogRecord>(response);
}

export async function deleteRecord(
  auth: ApiAuth,
  catalogKey: CatalogKey,
  id: number,
): Promise<{ deleted: boolean; id: number }> {
  const response = await apiFetch(`/api/catalogs/entries/${catalogKey}/${id}`, auth.token, {
    method: 'DELETE',
  });
  return parseApiResponse<{ deleted: boolean; id: number }>(response);
}
