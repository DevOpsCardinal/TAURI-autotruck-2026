import { AlertCircle, Eye, EyeOff, X } from 'lucide-react';
import { useFormik } from 'formik';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Yup from 'yup';
import { AuthUser } from '../../../auth/types/auth.types';
import { ApiAuth, ApiResponseError } from '../../../operation/types/operation.types';
import { createUser, updateUser } from '../../services/users.api';
import { Role, UserDrawerMode, UserRecord } from '../../types/admin.types';
import styles from './UserDrawer.module.css';

interface UserDrawerProps {
  mode: UserDrawerMode;
  user: UserRecord | null;
  roles: Role[];
  auth: ApiAuth;
  currentUser: AuthUser;
  onSuccess: () => void;
  onClose: () => void;
}

const NAME_REGEX = /^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/;

interface FormValues {
  nombre: string;
  apellido: string;
  cedula: string;
  nick: string;
  email: string;
  password: string;
  confirmPassword: string;
  rol_id: string;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function buildInitialValues(user: UserRecord | null, roles: Role[]): FormValues {
  const defaultRole = roles.find((role) => role.nombre === 'operario') ?? roles[0];
  return {
    nombre: user?.nombre ?? '',
    apellido: user?.apellido ?? '',
    cedula: user?.cedula ?? '',
    nick: user?.nick ?? '',
    email: user?.email ?? '',
    password: '',
    confirmPassword: '',
    rol_id: String(user?.rol_id ?? defaultRole?.id ?? ''),
  };
}

function buildValidationSchema(mode: UserDrawerMode) {
  const base = {
    nombre: Yup.string()
      .trim()
      .required('El nombre es requerido')
      .min(2, 'El nombre debe tener entre 2 y 80 caracteres')
      .max(80, 'El nombre debe tener entre 2 y 80 caracteres')
      .matches(NAME_REGEX, 'El nombre solo puede contener letras y espacios'),
    apellido: Yup.string()
      .trim()
      .required('El apellido es requerido')
      .min(2, 'El apellido debe tener entre 2 y 80 caracteres')
      .max(80, 'El apellido debe tener entre 2 y 80 caracteres')
      .matches(NAME_REGEX, 'El apellido solo puede contener letras y espacios'),
    cedula: Yup.string()
      .trim()
      .required('La cédula es requerida')
      .matches(/^\d{7,12}$/, 'La cédula debe tener entre 7 y 12 dígitos numéricos'),
    email: Yup.string()
      .trim()
      .email('El formato del correo no es válido')
      .max(254, 'El correo no puede exceder 254 caracteres')
      .nullable(),
    rol_id: Yup.string().required('El rol es requerido'),
  };

  if (mode === 'create') {
    return Yup.object({
      ...base,
      nick: Yup.string()
        .trim()
        .required('El usuario es requerido')
        .min(3, 'El usuario debe tener entre 3 y 30 caracteres')
        .max(30, 'El usuario debe tener entre 3 y 30 caracteres')
        .matches(/^[a-z0-9_.-]+$/, 'Solo letras minúsculas, números, puntos, guiones y guiones bajos'),
      password: Yup.string()
        .required('La contraseña es requerida')
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .max(128, 'La contraseña no puede exceder 128 caracteres')
        .matches(/[A-Z]/, 'La contraseña debe tener al menos 1 letra mayúscula')
        .matches(/[0-9]/, 'La contraseña debe tener al menos 1 número'),
      confirmPassword: Yup.string()
        .required('Confirma la contraseña')
        .oneOf([Yup.ref('password')], 'Las contraseñas no coinciden'),
    });
  }

  return Yup.object(base);
}

export function UserDrawer({
  mode,
  user,
  roles,
  auth,
  currentUser,
  onSuccess,
  onClose,
}: UserDrawerProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const canAssignSuper = currentUser.rol === 'super_administrador';
  const isSelfEdit = mode === 'edit' && user?.id === currentUser.id;

  const initialValues = useMemo(
    () => buildInitialValues(user, roles),
    [user, roles],
  );

  const validationSchema = useMemo(() => buildValidationSchema(mode), [mode]);

  const formik = useFormik<FormValues>({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);
      setFieldErrors({});
      try {
        if (mode === 'create') {
          await createUser(auth, {
            cedula: values.cedula.trim(),
            nombre: values.nombre.trim(),
            apellido: values.apellido.trim(),
            nick: values.nick.trim().toLowerCase(),
            email: values.email.trim() || undefined,
            password: values.password,
            confirmPassword: values.confirmPassword,
            rol_id: Number(values.rol_id),
          });
        } else if (user) {
          await updateUser(auth, user.id, {
            cedula: values.cedula.trim(),
            nombre: values.nombre.trim(),
            apellido: values.apellido.trim(),
            email: values.email.trim() || null,
            ...(isSelfEdit ? {} : { rol_id: Number(values.rol_id) }),
          });
        }
        onSuccess();
      } catch (error) {
        if (error instanceof ApiResponseError) {
          setServerError(error.message);
          if (error.errors) {
            const next: Record<string, string> = {};
            for (const item of error.errors) {
              next[item.field] = item.message;
            }
            setFieldErrors(next);
          }
        } else {
          setServerError('No se pudo guardar el usuario. Intenta de nuevo.');
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(() => onClose(), 150);
  }, [onClose]);

  const handleRequestClose = useCallback(() => {
    if (formik.dirty) {
      setShowDiscardConfirm(true);
      return;
    }
    closeDrawer();
  }, [formik.dirty, closeDrawer]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') handleRequestClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRequestClose]);

  const title = mode === 'create' ? 'Nuevo usuario' : 'Editar usuario';
  const submitLabel = mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios';
  const submitDisabled = mode === 'edit' && !formik.dirty;

  function renderFieldError(field: keyof FormValues) {
    const error = fieldErrors[field] ?? (formik.touched[field] ? formik.errors[field] : undefined);
    if (!error) return null;
    return (
      <p className={styles.fieldError}>
        <AlertCircle size={12} aria-hidden />
        {error}
      </p>
    );
  }

  return (
    <>
      <div className={styles.backdrop} onClick={handleRequestClose} aria-hidden />
      <aside
        className={`${styles.drawer} ${isVisible && !isClosing ? styles.drawerOpen : styles.drawerClosed}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-drawer-title"
      >
        <div className={styles.drawerHeader}>
          <h3 id="user-drawer-title">{title}</h3>
          <button type="button" className={styles.closeButton} onClick={handleRequestClose} aria-label="Cerrar">
            <X size={16} aria-hidden />
          </button>
        </div>

        <form className={styles.drawerBody} onSubmit={formik.handleSubmit} noValidate>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="user-nombre">Nombre<span className={styles.required}>*</span></label>
            <input
              id="user-nombre"
              name="nombre"
              className={`${styles.textInput} ${fieldErrors.nombre || formik.errors.nombre ? styles.textInputError : ''}`}
              value={formik.values.nombre}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {renderFieldError('nombre')}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="user-apellido">Apellido<span className={styles.required}>*</span></label>
            <input
              id="user-apellido"
              name="apellido"
              className={`${styles.textInput} ${fieldErrors.apellido || formik.errors.apellido ? styles.textInputError : ''}`}
              value={formik.values.apellido}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {renderFieldError('apellido')}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="user-cedula">Cédula<span className={styles.required}>*</span></label>
            <input
              id="user-cedula"
              name="cedula"
              inputMode="numeric"
              className={`${styles.textInput} ${fieldErrors.cedula || formik.errors.cedula ? styles.textInputError : ''}`}
              value={formik.values.cedula}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, '');
                formik.setFieldValue('cedula', digits);
              }}
              onBlur={formik.handleBlur}
            />
            {renderFieldError('cedula')}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="user-nick">
              Usuario (nick)
              {mode === 'create' && <span className={styles.required}>*</span>}
              {mode === 'edit' && <span className={styles.lockedBadge}>No editable</span>}
            </label>
            {mode === 'create' ? (
              <>
                <input
                  id="user-nick"
                  name="nick"
                  className={`${styles.textInput} ${fieldErrors.nick || formik.errors.nick ? styles.textInputError : ''}`}
                  value={formik.values.nick}
                  onChange={(event) => {
                    formik.setFieldValue('nick', event.target.value.toLowerCase());
                  }}
                  onBlur={formik.handleBlur}
                />
                {renderFieldError('nick')}
              </>
            ) : (
              <p className={styles.readOnlyValue}>{user?.nick}</p>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="user-email">Correo</label>
            <input
              id="user-email"
              name="email"
              type="email"
              className={`${styles.textInput} ${fieldErrors.email || formik.errors.email ? styles.textInputError : ''}`}
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {renderFieldError('email')}
          </div>

          {mode === 'create' && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="user-password">Contraseña<span className={styles.required}>*</span></label>
                <div className={styles.passwordWrap}>
                  <input
                    id="user-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.textInput} ${fieldErrors.password || formik.errors.password ? styles.textInputError : ''}`}
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  <button type="button" className={styles.togglePassword} onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {renderFieldError('password')}
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="user-confirm-password">Confirmar contraseña<span className={styles.required}>*</span></label>
                <div className={styles.passwordWrap}>
                  <input
                    id="user-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`${styles.textInput} ${fieldErrors.confirmPassword || formik.errors.confirmPassword ? styles.textInputError : ''}`}
                    value={formik.values.confirmPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  <button type="button" className={styles.togglePassword} onClick={() => setShowConfirmPassword((value) => !value)}>
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {renderFieldError('confirmPassword')}
              </div>
            </>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="user-rol">
              Rol
              <span className={styles.required}>*</span>
              {isSelfEdit && <span className={styles.lockedBadge}>No editable</span>}
            </label>
            <select
              id="user-rol"
              name="rol_id"
              className={styles.selectInput}
              value={formik.values.rol_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={isSelfEdit}
            >
              {roles.map((role) => (
                <option
                  key={role.id}
                  value={role.id}
                  disabled={role.nombre === 'super_administrador' && !canAssignSuper}
                >
                  {role.nombre === 'operario' && 'Operario'}
                  {role.nombre === 'administrador' && 'Administrador'}
                  {role.nombre === 'super_administrador' && 'Super Administrador'}
                </option>
              ))}
            </select>
            {renderFieldError('rol_id')}
          </div>

          {mode === 'edit' && user && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Fecha de creación</label>
              <p className={styles.readOnlyValue}>{formatDate(user.creado_en)}</p>
            </div>
          )}

          {serverError && !Object.keys(fieldErrors).length && (
            <div className={styles.errorBanner}>{serverError}</div>
          )}
        </form>

        <div className={styles.drawerFooter}>
          <button type="button" className={styles.cancelBtn} onClick={handleRequestClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={formik.isSubmitting || submitDisabled}
            onClick={() => formik.handleSubmit()}
          >
            {formik.isSubmitting ? 'Guardando...' : submitLabel}
          </button>
        </div>
      </aside>

      {showDiscardConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog} role="alertdialog" aria-labelledby="discard-title">
            <h4 id="discard-title">¿Descartar cambios?</h4>
            <p>Los cambios sin guardar se perderán.</p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowDiscardConfirm(false)}>
                Seguir editando
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => {
                  setShowDiscardConfirm(false);
                  closeDrawer();
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
