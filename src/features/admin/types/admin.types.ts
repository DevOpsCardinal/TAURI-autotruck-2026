export type UserRole = 'operario' | 'administrador' | 'super_administrador';

export interface Role {
  id: number;
  nombre: UserRole;
  descripcion: string;
  nivel: number;
}

export interface UserRecord {
  id: number;
  cedula: string;
  nombre: string;
  apellido: string;
  nick: string;
  email: string | null;
  rol: UserRole;
  rol_id: number;
  activo: boolean;
  creado_en: string;
  ultimo_acceso: string | null;
}

export interface UsersListResponse {
  data: UserRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateUserPayload {
  cedula: string;
  nombre: string;
  apellido: string;
  nick: string;
  email?: string;
  password: string;
  confirmPassword: string;
  rol_id: number;
}

export interface UpdateUserPayload {
  cedula?: string;
  nombre?: string;
  apellido?: string;
  email?: string | null;
  rol_id?: number;
}

export interface UserFiltersState {
  q: string;
  roles: UserRole[];
  activo: 'all' | 'active' | 'inactive';
}

export type UserDrawerMode = 'create' | 'edit';

export interface UserDrawerState {
  open: boolean;
  mode: UserDrawerMode;
  user: UserRecord | null;
}
