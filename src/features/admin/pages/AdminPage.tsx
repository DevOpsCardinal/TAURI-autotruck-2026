import { ChevronLeft } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { ApiUnauthorizedError } from '../../operation/api/api.config';
import { useToast } from '../../operation/components/Toast/ToastContext';
import { ApiAuth } from '../../operation/types/operation.types';
import { UserDrawer } from '../components/UserDrawer/UserDrawer';
import { UserFilters } from '../components/UserFilters/UserFilters';
import { UserTable } from '../components/UserTable/UserTable';
import { useUsers } from '../hooks/useUsers';
import styles from './AdminPage.module.css';

export function AdminPage() {
  const navigate = useNavigate();
  const { auth, accessToken } = useAuth();
  const { showToast } = useToast();

  const apiAuth = useMemo<ApiAuth | null>(
    () => (accessToken ? { token: accessToken } : null),
    [accessToken],
  );

  const usersState = useUsers(apiAuth);

  if (!auth || !apiAuth) {
    return null;
  }

  async function handleReload() {
    try {
      await usersState.reload();
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        navigate('/login', { replace: true });
      }
    }
  }

  function handleCreateSuccess() {
    usersState.closeDrawer();
    void handleReload();
    showToast('success', 'Usuario creado correctamente');
  }

  function handleUpdateSuccess() {
    usersState.closeDrawer();
    void handleReload();
    showToast('success', 'Usuario actualizado');
  }

  return (
    <div className={styles.adminPage}>
      <header className={styles.pageHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/operation')}
        >
          <ChevronLeft size={18} aria-hidden />
          Operaciones
        </button>
        <h1 className={styles.pageTitle}>Administración de Usuarios</h1>
      </header>

      <div className={styles.pageContent}>
        <UserFilters
          filters={usersState.filters}
          canManageSuperAdmins={auth.rol === 'super_administrador'}
          onSearchChange={usersState.updateSearch}
          onToggleRole={usersState.toggleRole}
          onStatusChange={usersState.setStatusFilter}
          onClearFilters={usersState.clearFilters}
          onRemoveRoleFilter={usersState.removeRoleFilter}
          onRemoveStatusFilter={usersState.removeStatusFilter}
          onNewUser={usersState.openCreateDrawer}
        />

        <div className={styles.tableArea}>
          {usersState.loading ? (
            <div className={styles.stateMessage}>Cargando usuarios...</div>
          ) : usersState.error ? (
            <div className={styles.stateMessage}>
              {usersState.error}
              <button type="button" className={styles.retryButton} onClick={() => void handleReload()}>
                Reintentar
              </button>
            </div>
          ) : (
            <UserTable
              users={usersState.users}
              auth={apiAuth}
              currentUserId={auth.id}
              onEdit={usersState.openEditDrawer}
              onRefresh={() => void handleReload()}
              onNotify={(type, message) => showToast(type, message)}
            />
          )}
        </div>

        {usersState.drawerState.open && (
          <UserDrawer
            mode={usersState.drawerState.mode}
            user={usersState.drawerState.user}
            roles={usersState.roles}
            auth={apiAuth}
            currentUser={auth}
            onSuccess={usersState.drawerState.mode === 'create' ? handleCreateSuccess : handleUpdateSuccess}
            onClose={usersState.closeDrawer}
          />
        )}
      </div>
    </div>
  );
}
