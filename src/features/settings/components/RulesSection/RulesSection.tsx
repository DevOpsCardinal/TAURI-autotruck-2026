import { BusinessRule } from '../../api/settings.api';
import { RuleToggle } from '../RuleToggle/RuleToggle';
import styles from './RulesSection.module.css';

interface RulesSectionProps {
  rules: BusinessRule[];
  isLoading: boolean;
  error: string | null;
  onToggle: (parametro: string) => void;
  onRetry: () => void;
}

function RulesSkeleton() {
  return (
    <div className={styles.skeletonCard} aria-hidden>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLineShort} />
      </div>
      <div className={styles.skeletonToggle} />
    </div>
  );
}

export function RulesSection({
  rules,
  isLoading,
  error,
  onToggle,
  onRetry,
}: RulesSectionProps) {
  return (
    <section className={styles.section} aria-labelledby="business-rules-title">
      <h2 id="business-rules-title" className={styles.title}>
        Reglas de negocio
      </h2>
      <div className={styles.separator} />

      {isLoading && (
        <>
          <RulesSkeleton />
          <RulesSkeleton />
        </>
      )}

      {!isLoading && error && (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
          <button type="button" className={styles.retryButton} onClick={onRetry}>
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className={styles.list}>
          {rules.map((rule) => (
            <RuleToggle
              key={rule.parametro}
              nombre={rule.nombre}
              descripcion={rule.descripcion}
              activa={rule.activa}
              cargando={rule.cargando}
              onToggle={() => onToggle(rule.parametro)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
