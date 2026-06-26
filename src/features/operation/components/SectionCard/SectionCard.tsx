import styles from './SectionCard.module.css';

interface SectionCardProps {
  title: string;
  conditional?: boolean;
  exiting?: boolean;
  fullWidth?: boolean;
  growable?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function SectionCard({
  title,
  conditional = false,
  exiting = false,
  fullWidth = false,
  growable = false,
  style,
  children,
}: SectionCardProps) {
  return (
    <section
      className={`${styles.card} ${conditional ? styles.conditional : ''} ${
        exiting ? styles.conditionalExit : ''
      } ${fullWidth ? styles.fullWidth : ''} ${growable ? styles.growable : ''}`}
      style={style}
    >
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.divider} aria-hidden />
      </div>
      <div className={`${styles.content} ${growable ? styles.contentFill : ''}`}>{children}</div>
    </section>
  );
}
