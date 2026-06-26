import { Eye, EyeOff, MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiAuth, ApiResponseError } from '../../../operation/types/operation.types';
import { resetUserPassword, setUserStatus } from '../../services/users.api';
import { UserRecord } from '../../types/admin.types';
import { RoleBadge } from '../RoleBadge/RoleBadge';
import { UserStatusBadge } from '../UserStatusBadge/UserStatusBadge';
import styles from './UserTable.module.css';

interface UserTableProps {
  users: UserRecord[];
  auth: ApiAuth;
  currentUserId: number;
  onEdit: (user: UserRecord) => void;
  onRefresh: () => void;
  onNotify: (type: 'success' | 'error', message: string) => void;
}

function formatDate(value: string | null): string {
  if (!value) return 'Nunca';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getFullName(user: UserRecord): string {
  return `${user.nombre} ${user.apellido}`.trim();
}

interface StatusDialogProps {
  user: UserRecord;
  auth: ApiAuth;
  onConfirm: () => void;
  onCancel: () => void;
}

function StatusConfirmDialog({ user, auth, onConfirm, onCancel }: StatusDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDeactivating = user.activo;
  const fullName = getFullName(user);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await setUserStatus(auth, user.id, !user.activo);
      onConfirm();
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setError(err.message);
      } else {
        setError('No se pudo actualizar el estado del usuario.');
      }
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <div className={styles.modal} role="alertdialog" aria-labelledby="status-dialog-title">
        <h3 id="status-dialog-title">
          {isDeactivating ? 'Desactivar usuario' : 'Activar usuario'}
        </h3>
        {error ? (
          <div className={styles.errorBanner}>{error}</div>
        ) : (
          <p>
            {isDeactivating ? (
              <>
                ¿Desactivar a <strong>{fullName}</strong> (<code>{user.nick}</code>)? El usuario perderá acceso inmediatamente.
              </>
            ) : (
              <>
                ¿Activar a <strong>{fullName}</strong> (<code>{user.nick}</code>)? El usuario podrá iniciar sesión nuevamente.
              </>
            )}
          </p>
        )}
        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          {!error && (
            <button
              type="button"
              className={`${styles.primaryButton} ${isDeactivating ? styles.dangerButton : styles.successButton}`}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Procesando...' : isDeactivating ? 'Desactivar' : 'Activar'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface ResetPasswordDialogProps {
  user: UserRecord;
  auth: ApiAuth;
  onConfirm: () => void;
  onCancel: () => void;
}

function validatePasswordFields(password: string, confirmPassword: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres';
  } else if (!/[A-Z]/.test(password)) {
    errors.password = 'La contraseña debe tener al menos 1 letra mayúscula';
  } else if (!/[0-9]/.test(password)) {
    errors.password = 'La contraseña debe tener al menos 1 número';
  }
  if (password !== confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }
  return errors;
}

function ResetPasswordDialog({ user, auth, onConfirm, onCancel }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit() {
    const clientErrors = validatePasswordFields(password, confirmPassword);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setLoading(true);
    setServerError(null);
    try {
      await resetUserPassword(auth, user.id, password, confirmPassword);
      onConfirm();
    } catch (err) {
      if (err instanceof ApiResponseError) {
        if (err.errors?.length) {
          const mapped: Record<string, string> = {};
          for (const item of err.errors) {
            mapped[item.field] = item.message;
          }
          setFieldErrors(mapped);
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError('No se pudo restablecer la contraseña.');
      }
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <div className={styles.modal} role="dialog" aria-labelledby="reset-password-title">
        <h3 id="reset-password-title">
          Restablecer contraseña — {getFullName(user)} ({user.nick})
        </h3>
        {serverError && <div className={styles.errorBanner}>{serverError}</div>}
        <div className={styles.field}>
          <label htmlFor="new-password">Nueva contraseña</label>
          <div className={styles.passwordWrap}>
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
        </div>
        <div className={styles.field}>
          <label htmlFor="confirm-password">Confirmar contraseña</label>
          <div className={styles.passwordWrap}>
            <input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowConfirm((value) => !value)}
              aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <span className={styles.fieldError}>{fieldErrors.confirmPassword}</span>
          )}
        </div>
        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Restableciendo...' : 'Restablecer'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function UserActionsMenu({
  user,
  currentUserId,
  onEdit,
  onToggleStatus,
  onResetPassword,
}: {
  user: UserRecord;
  currentUserId: number;
  onEdit: () => void;
  onToggleStatus: () => void;
  onResetPassword: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className={styles.menuWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={() => setOpen((value) => !value)}
        aria-label={`Acciones para ${user.nick}`}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className={styles.menuDropdown}>
          <button type="button" className={styles.menuItem} onClick={() => { setOpen(false); onEdit(); }}>
            Editar
          </button>
          {user.id !== currentUserId && (
            <button
              type="button"
              className={`${styles.menuItem} ${user.activo ? styles.menuItemDanger : ''}`}
              onClick={() => { setOpen(false); onToggleStatus(); }}
            >
              {user.activo ? 'Desactivar' : 'Activar'}
            </button>
          )}
          <button type="button" className={styles.menuItem} onClick={() => { setOpen(false); onResetPassword(); }}>
            Restablecer contraseña
          </button>
        </div>
      )}
    </div>
  );
}

export function UserTable({
  users,
  auth,
  currentUserId,
  onEdit,
  onRefresh,
  onNotify,
}: UserTableProps) {
  const [statusTarget, setStatusTarget] = useState<UserRecord | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<UserRecord | null>(null);

  if (users.length === 0) {
    return <div className={styles.emptyState}>No se encontraron usuarios.</div>;
  }

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Último acceso</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{getFullName(user)}</td>
                <td className={styles.nick}>{user.nick}</td>
                <td>{user.email ?? '—'}</td>
                <td><RoleBadge role={user.rol} /></td>
                <td><UserStatusBadge activo={user.activo} /></td>
                <td>{formatDate(user.creado_en)}</td>
                <td>{formatDate(user.ultimo_acceso)}</td>
                <td className={styles.actionsCell}>
                  <UserActionsMenu
                    user={user}
                    currentUserId={currentUserId}
                    onEdit={() => onEdit(user)}
                    onToggleStatus={() => setStatusTarget(user)}
                    onResetPassword={() => setPasswordTarget(user)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {statusTarget && (
        <StatusConfirmDialog
          user={statusTarget}
          auth={auth}
          onCancel={() => setStatusTarget(null)}
          onConfirm={() => {
            setStatusTarget(null);
            onRefresh();
            onNotify(
              'success',
              statusTarget.activo ? 'Usuario desactivado correctamente' : 'Usuario activado correctamente',
            );
          }}
        />
      )}

      {passwordTarget && (
        <ResetPasswordDialog
          user={passwordTarget}
          auth={auth}
          onCancel={() => setPasswordTarget(null)}
          onConfirm={() => {
            setPasswordTarget(null);
            onNotify('success', 'Contraseña restablecida correctamente');
          }}
        />
      )}
    </>
  );
}
