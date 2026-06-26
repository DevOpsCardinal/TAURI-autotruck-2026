import { LoginCredentials, LoginResponse, LicenseInfo, LoginError } from '../types/auth.types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const REQUEST_TIMEOUT_MS = 10000;

export async function login(credentials: LoginCredentials): Promise<LoginResponse | LoginError> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json();

    if (!response.ok) {
      return {
        code: data.code ?? 'INTERNAL_ERROR',
        message: data.message ?? 'Error interno del servidor',
      };
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      user: data.user,
      license: {
        expiresAt: data.license.expires_at,
        daysRemaining: data.license.days_remaining,
        status: getLicenseStatus(data.license.days_remaining),
      },
    };
  } catch (error: unknown) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      return { code: 'TIMEOUT', message: 'No se pudo conectar al servidor. Intenta nuevamente.' };
    }
    return { code: 'NETWORK_ERROR', message: 'No se pudo conectar al servidor. Verifica tu conexión.' };
  }
}

function getLicenseStatus(daysRemaining: number): 'active' | 'warning' | 'expired' {
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= 15) return 'warning';
  return 'active';
}

export async function checkLicense(): Promise<LicenseInfo | LoginError> {
  try {
    const response = await fetch(`${API_URL}/api/auth/license-status`);
    const data = await response.json();

    if (!response.ok) {
      return { code: data.code ?? 'LICENSE_NOT_FOUND', message: data.message ?? 'Sin licencia' };
    }

    return {
      expiresAt: data.expires_at,
      daysRemaining: data.days_remaining,
      status: getLicenseStatus(data.days_remaining),
    };
  } catch {
    return { code: 'NETWORK_ERROR', message: 'No se pudo verificar la licencia.' };
  }
}

export function isLoginError(value: LoginResponse | LoginError): value is LoginError {
  return 'code' in value && 'message' in value && !('accessToken' in value);
}

export function isLicenseError(value: LicenseInfo | LoginError): value is LoginError {
  return 'code' in value && 'message' in value;
}
