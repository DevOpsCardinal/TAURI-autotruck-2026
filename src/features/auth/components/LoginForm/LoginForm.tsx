import { useLoginForm } from '../../hooks/useLoginForm';
import { ErrorMessage } from '../ErrorMessage/ErrorMessage';
import { LoadingState } from '../LoadingState/LoadingState';
import { PasswordVisibilityToggle } from '../PasswordVisibilityToggle/PasswordVisibilityToggle';
import { LoginResponse } from '../../types/auth.types';
import styles from './LoginForm.module.css';

interface LoginFormProps {
  onSuccess: (response: LoginResponse) => void;
  disabled?: boolean;
}

export function LoginForm({ onSuccess, disabled = false }: LoginFormProps) {
  const {
    username, password, showPassword, isLoading, fieldErrors, globalError,
    passwordInputRef,
    handleUsernameChange, handlePasswordChange,
    handleUsernameBlur, handlePasswordBlur, handleUsernameKeyDown,
    handleTogglePassword, handleSubmit,
  } = useLoginForm({ onSuccess });

  const isDisabled = disabled || isLoading;

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      {globalError && (
        <ErrorMessage message={globalError} variant="banner" id="login-global-error" />
      )}

      <div className={styles.field}>
        <label htmlFor="username" className={styles.label}>Usuario</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => handleUsernameChange(e.target.value)}
          onBlur={handleUsernameBlur}
          onKeyDown={handleUsernameKeyDown}
          placeholder="Tu nombre de usuario"
          autoComplete="username"
          autoFocus
          disabled={isDisabled}
          aria-describedby={fieldErrors.username ? 'error-username' : undefined}
          aria-invalid={!!fieldErrors.username}
          className={`${styles.input} ${fieldErrors.username ? styles.inputError : ''}`}
        />
        {fieldErrors.username && (
          <ErrorMessage message={fieldErrors.username} variant="field" id="error-username" />
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="password" className={styles.label}>Contraseña</label>
        <div className={styles.passwordWrapper}>
          <input
            ref={passwordInputRef}
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            onBlur={handlePasswordBlur}
            placeholder="Tu contraseña"
            autoComplete="current-password"
            disabled={isDisabled}
            aria-describedby={fieldErrors.password ? 'error-password' : undefined}
            aria-invalid={!!fieldErrors.password}
            className={`${styles.input} ${styles.inputWithToggle} ${fieldErrors.password ? styles.inputError : ''}`}
          />
          <PasswordVisibilityToggle isVisible={showPassword} onToggle={handleTogglePassword} />
        </div>
        {fieldErrors.password && (
          <ErrorMessage message={fieldErrors.password} variant="field" id="error-password" />
        )}
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        className={styles.submitButton}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <LoadingState size={18} color="#FFFFFF" />
            <span>Iniciando sesión...</span>
          </>
        ) : (
          <span>INICIAR SESIÓN</span>
        )}
      </button>
    </form>
  );
}
