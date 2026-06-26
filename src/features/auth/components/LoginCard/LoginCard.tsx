import styles from './LoginCard.module.css';
import { LicenseInfo } from '../../types/auth.types';

interface LoginCardProps {
  logoSrc: string;
  licenseWarning?: LicenseInfo | null;
  licenseNotFound?: boolean;
  licenseLoading?: boolean;
  children: React.ReactNode;
}

export function LoginCard({
  logoSrc,
  licenseWarning,
  licenseNotFound = false,
  licenseLoading = false,
  children,
}: LoginCardProps) {
  return (
    <div className={`${styles.panel} login-panel-enter`}>
      <div className={styles.content}>
        <img src={logoSrc} alt="Cardinal Weighing Colombia" className={styles.logo} />
        <h2 className={styles.heading}>Iniciar sesión</h2>
        <p className={styles.subheading}>Ingresa tus credenciales para continuar</p>

        {licenseLoading && (
          <div className={styles.licenseLoading} aria-live="polite">
            <span className={styles.loadingDot} aria-hidden="true" />
            Verificando licencia...
          </div>
        )}

        {licenseNotFound && (
          <div className={styles.licenseExpired} role="alert">
            No se encontró una licencia activa. Comunícate con Cardinal Weighing Colombia.
          </div>
        )}

        {licenseWarning?.status === 'warning' && (
          <div className={styles.licenseWarning} role="status">
            Tu licencia vence en {licenseWarning.daysRemaining} día{licenseWarning.daysRemaining !== 1 ? 's' : ''}.
            Contacta a Cardinal Weighing Colombia.
          </div>
        )}

        {licenseWarning?.status === 'expired' && !licenseNotFound && (
          <div className={styles.licenseExpired} role="alert">
            La licencia del sistema ha vencido. Comunícate con Cardinal Weighing Colombia.
          </div>
        )}

        {children}

        <p className={styles.copyright}>
          © {new Date().getFullYear()} Cardinal Weighing Colombia
        </p>
      </div>
    </div>
  );
}
