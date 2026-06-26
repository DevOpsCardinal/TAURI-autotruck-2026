import { ApiErrorBody, ApiResponseError } from '../types/operation.types';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const REQUEST_TIMEOUT_MS = 30_000;

export class ApiUnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'ApiUnauthorizedError';
  }
}

export class ApiTimeoutError extends Error {
  constructor() {
    super('La solicitud tardó demasiado. Verifica la conexión con el servidor.');
    this.name = 'ApiTimeoutError';
  }
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new ApiResponseError(body as ApiErrorBody);
  }
  return body as T;
}

export async function apiFetch(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    });

    if (response.status === 401) {
      throw new ApiUnauthorizedError();
    }

    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiTimeoutError();
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
