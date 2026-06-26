import { ChevronLeft } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import styles from './ReportsLayout.module.css';

interface ReportsLayoutProps {
  title: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

const NAV_ITEMS = [
  { to: '/reports/summary', label: 'Resumen' },
  { to: '/reports/ingresos', label: 'Ingresos' },
  { to: '/reports/despachos', label: 'Despachos' },
  { to: '/reports/transit', label: 'Historial de Tránsito' },
];

export function ReportsLayout({ title, children, headerAction }: ReportsLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.reportsLayout}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate('/operation')}
          >
            <ChevronLeft size={16} aria-hidden />
            Operaciones
          </button>
          <span className={styles.breadcrumb}>
            Reportes › <strong>{title}</strong>
          </span>
        </div>
        {headerAction}
      </header>

      <nav className={styles.nav} aria-label="Secciones de reportes">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
