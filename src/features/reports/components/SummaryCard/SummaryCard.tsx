import type { LucideIcon } from 'lucide-react';
import styles from './SummaryCard.module.css';

interface SummaryCardProps {
  title: string;
  label: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
}

export function SummaryCard({ title, label, value, unit, icon: Icon }: SummaryCardProps) {
  const displayValue = typeof value === 'number'
    ? new Intl.NumberFormat('es-CO').format(value)
    : value;

  return (
    <div className={styles.summaryCard}>
      <div className={styles.iconWrap}>
        <Icon size={20} aria-hidden />
      </div>
      <div className={styles.body}>
        <div className={styles.title}>{title}</div>
        <div className={styles.value}>
          {displayValue}
          {unit ? <span className={styles.unit}>{unit}</span> : null}
        </div>
        <div className={styles.label}>{label}</div>
      </div>
    </div>
  );
}
