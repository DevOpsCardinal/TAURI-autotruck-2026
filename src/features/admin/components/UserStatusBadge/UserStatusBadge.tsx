import styles from './UserStatusBadge.module.css';

interface UserStatusBadgeProps {
  activo: boolean;
}

export function UserStatusBadge({ activo }: UserStatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${activo ? styles.active : styles.inactive}`}>
      <span className={styles.dot} aria-hidden />
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}
