import { apiFetch, parseApiResponse } from '../../operation/api/api.config';
import { ApiAuth } from '../../operation/types/operation.types';
import { CatalogKey, CatalogRecord } from '../types/catalog.types';

interface ConfiguracionesResponse {
  data: Array<{
    parametro: string;
    valor: string;
    descripcion: string | null;
  }>;
}

const CATALOG_ENDPOINTS: Record<Exclude<CatalogKey, 'configuraciones'>, string> = {
  conductores: '/api/conductores',
  plantas: '/api/plantas',
  proveedores: '/api/proveedores',
  clientes: '/api/clientes',
  transportadoras: '/api/transportadoras',
  origenes: '/api/origenes',
  destinos: '/api/destinos',
  materias: '/api/materias',
  productos: '/api/productos',
};

export async function fetchCatalogRecords(
  auth: ApiAuth,
  catalogKey: CatalogKey,
): Promise<CatalogRecord[]> {
  if (catalogKey === 'configuraciones') {
    const response = await apiFetch('/api/configuraciones', auth.token);
    const body = await parseApiResponse<ConfiguracionesResponse>(response);
    return body.data.map((item) => ({
      id: item.parametro,
      parametro: item.parametro,
      valor: item.valor,
      descripcion: item.descripcion,
    }));
  }

  const endpoint = CATALOG_ENDPOINTS[catalogKey];
  const response = await apiFetch(endpoint, auth.token);
  return parseApiResponse<CatalogRecord[]>(response);
}
