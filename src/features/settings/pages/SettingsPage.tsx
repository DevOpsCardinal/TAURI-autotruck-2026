import { ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { EmpresaSection } from '../components/EmpresaSection/EmpresaSection';
import { IndicadorSection } from '../components/IndicadorSection/IndicadorSection';
import { RulesSection } from '../components/RulesSection/RulesSection';
import { useBusinessRules } from '../hooks/useBusinessRules';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { rules, isLoading, error, toggleRule, reload } = useBusinessRules();

  const hasAccess = auth?.rol === 'administrador' || auth?.rol === 'super_administrador';

  useEffect(() => {
    if (auth && !hasAccess) {
      navigate('/', { replace: true });
    }
  }, [auth, hasAccess, navigate]);

  if (!auth || !hasAccess) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate('/')}
          >
            <ChevronLeft size={18} aria-hidden />
            Volver
          </button>
          <h1 className={styles.title}>Configuraciones del sistema</h1>
          <p className={styles.subtitle}>
            Administra los datos de la empresa y las reglas de comportamiento de la báscula.
          </p>
        </header>

        <EmpresaSection />

        <IndicadorSection />

        <RulesSection
          rules={rules}
          isLoading={isLoading}
          error={error}
          onToggle={(parametro) => {
            void toggleRule(parametro);
          }}
          onRetry={() => {
            void reload();
          }}
        />
      </div>
    </div>
  );
}
