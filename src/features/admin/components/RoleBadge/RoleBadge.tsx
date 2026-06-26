import { UserRole } from '../../types/admin.types';
import styles from './RoleBadge.module.css';

const ROLE_LABELS: Record<UserRole, string> = {
  operario: 'Operario',
  administrador: 'Administrador',
  super_administrador: 'Super Admin',
};

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
