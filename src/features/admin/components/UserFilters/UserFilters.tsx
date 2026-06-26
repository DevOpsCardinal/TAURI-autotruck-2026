import { useState } from 'react';
import { Filter, Plus, Search, X } from 'lucide-react';
import { UserFiltersState, UserRole } from '../../types/admin.types';
import styles from './UserFilters.module.css';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'operario', label: 'Operario' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'super_administrador', label: 'Super Administrador' },
];

const ROLE_LABELS: Record<UserRole, string> = {
  operario: 'Operario',
  administrador: 'Administrador',
  super_administrador: 'Super Administrador',
};

interface UserFiltersProps {
  filters: UserFiltersState;
  canManageSuperAdmins: boolean;
  onSearchChange: (q: string) => void;
  onToggleRole: (role: UserRole) => void;
  onStatusChange: (activo: UserFiltersState['activo']) => void;
  onClearFilters: () => void;
  onRemoveRoleFilter: (role: UserRole) => void;
  onRemoveStatusFilter: () => void;
  onNewUser: () => void;
}

export function UserFilters({
  filters,
  canManageSuperAdmins,
  onSearchChange,
  onToggleRole,
  onStatusChange,
  onClearFilters,
  onRemoveRoleFilter,
  onRemoveStatusFilter,
  onNewUser,
}: UserFiltersProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  const hasActiveFilters =
    filters.roles.length > 0 || filters.activo !== 'all';

  const roleOptions = canManageSuperAdmins
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((option) => option.value !== 'super_administrador');

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarRow}>
        <div className={styles.leftGroup}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} aria-hidden />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Buscar por nombre, usuario o correo..."
              value={filters.q}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <button
            type="button"
            className={`${styles.filterToggle} ${panelOpen || hasActiveFilters ? styles.filterToggleActive : ''}`}
            onClick={() => setPanelOpen((open) => !open)}
          >
            <Filter size={16} aria-hidden />
            Filtros
          </button>
        </div>
        <button type="button" className={styles.newButton} onClick={onNewUser}>
          <Plus size={16} aria-hidden />
          Nuevo
        </button>
      </div>

      {panelOpen && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <label htmlFor="role-filter">Rol</label>
            <select
              id="role-filter"
              value=""
              onChange={(event) => {
                const value = event.target.value as UserRole;
                if (value) onToggleRole(value);
                event.target.value = '';
              }}
            >
              <option value="">Seleccionar rol...</option>
              {roleOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={filters.roles.includes(option.value)}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="status-filter">Estado</label>
            <select
              id="status-filter"
              value={filters.activo}
              onChange={(event) => onStatusChange(event.target.value as UserFiltersState['activo'])}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className={styles.chipsRow}>
          {filters.roles.map((role) => (
            <span key={role} className={styles.chip}>
              Rol: {ROLE_LABELS[role]}
              <button type="button" onClick={() => onRemoveRoleFilter(role)} aria-label={`Quitar filtro ${ROLE_LABELS[role]}`}>
                <X size={12} />
              </button>
            </span>
          ))}
          {filters.activo !== 'all' && (
            <span className={styles.chip}>
              Estado: {filters.activo === 'active' ? 'Activos' : 'Inactivos'}
              <button type="button" onClick={onRemoveStatusFilter} aria-label="Quitar filtro de estado">
                <X size={12} />
              </button>
            </span>
          )}
          <button type="button" className={styles.clearFilters} onClick={onClearFilters}>
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
