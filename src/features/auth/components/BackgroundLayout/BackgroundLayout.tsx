import styles from './BackgroundLayout.module.css';

interface BackgroundLayoutProps {
  children: React.ReactNode;
}

export function BackgroundLayout({ children }: BackgroundLayoutProps) {
  return (
    <main className={styles.layout}>
      {children}
    </main>
  );
}
