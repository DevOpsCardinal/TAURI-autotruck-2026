import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiAuth } from '../../operation/types/operation.types';
import { ApiUnauthorizedError } from '../../operation/api/api.config';
import { fetchRoles, fetchUsers } from '../services/users.api';
import {
  Role,
  UserDrawerState,
  UserFiltersState,
  UserRecord,
  UserRole,
} from '../types/admin.types';

const DEFAULT_FILTERS: UserFiltersState = {
  q: '',
  roles: [],
  activo: 'all',
};

export function useUsers(auth: ApiAuth | null) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFiltersState>(DEFAULT_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [drawerState, setDrawerState] = useState<UserDrawerState>({
    open: false,
    mode: 'create',
    user: null,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQ(filters.q.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.q]);

  const queryParams = useMemo(() => {
    const activo =
      filters.activo === 'active' ? true : filters.activo === 'inactive' ? false : undefined;
    return {
      q: debouncedQ || undefined,
      rol: filters.roles.length > 0 ? filters.roles : undefined,
      activo,
      limit: 50,
      offset: 0,
    };
  }, [debouncedQ, filters.roles, filters.activo]);

  const loadUsers = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchUsers(auth, queryParams);
      setUsers(response.data);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        throw err;
      }
      setError('No se pudieron cargar los usuarios. Verifica que el servidor esté en ejecución.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [auth, queryParams]);

  const loadRoles = useCallback(async () => {
    if (!auth) return;
    try {
      const data = await fetchRoles(auth);
      setRoles(data);
    } catch {
      setRoles([]);
    }
  }, [auth]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function updateSearch(q: string) {
    setFilters((current) => ({ ...current, q }));
  }

  function toggleRole(role: UserRole) {
    setFilters((current) => ({
      ...current,
      roles: current.roles.includes(role)
        ? current.roles.filter((item) => item !== role)
        : [...current.roles, role],
    }));
  }

  function setStatusFilter(activo: UserFiltersState['activo']) {
    setFilters((current) => ({ ...current, activo }));
  }

  function clearFilters() {
    setFilters((current) => ({ ...current, roles: [], activo: 'all' }));
  }

  function removeRoleFilter(role: UserRole) {
    setFilters((current) => ({
      ...current,
      roles: current.roles.filter((item) => item !== role),
    }));
  }

  function removeStatusFilter() {
    setFilters((current) => ({ ...current, activo: 'all' }));
  }

  function openCreateDrawer() {
    setDrawerState({ open: true, mode: 'create', user: null });
  }

  function openEditDrawer(user: UserRecord) {
    setDrawerState({ open: true, mode: 'edit', user });
  }

  function closeDrawer() {
    setDrawerState({ open: false, mode: 'create', user: null });
  }

  return {
    users,
    roles,
    loading,
    error,
    filters,
    drawerState,
    updateSearch,
    toggleRole,
    setStatusFilter,
    clearFilters,
    removeRoleFilter,
    removeStatusFilter,
    openCreateDrawer,
    openEditDrawer,
    closeDrawer,
    reload: loadUsers,
  };
}
