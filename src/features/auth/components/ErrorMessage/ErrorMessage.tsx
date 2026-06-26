import styles from './ErrorMessage.module.css';

interface ErrorMessageProps {
  message: string;
  variant?: 'field' | 'banner';
  id?: string;
}

export function ErrorMessage({ message, variant = 'field', id }: ErrorMessageProps) {
  return (
    <div
      id={id}
      role="alert"
      className={`${styles.container} ${styles[variant]}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={styles.icon} aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span className={styles.text}>{message}</span>
    </div>
  );
}
