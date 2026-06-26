export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: number;
  username: string;
  nombre: string;
  rol: 'administrador' | 'operario' | 'super_administrador';
  activo: boolean;
}

export interface LicenseInfo {
  expiresAt: string;
  daysRemaining: number;
  status: 'active' | 'warning' | 'expired';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
  license: LicenseInfo;
}

export type LoginErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'USER_INACTIVE'
  | 'LICENSE_EXPIRED'
  | 'LICENSE_NOT_FOUND'
  | 'TOO_MANY_ATTEMPTS'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT';

export interface LoginError {
  code: LoginErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
}

export interface FieldErrors {
  username?: string;
  password?: string;
}

export interface AuthContextValue {
  auth: AuthUser | null | undefined;
  license: LicenseInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (response: LoginResponse) => void;
  logout: () => void;
}
