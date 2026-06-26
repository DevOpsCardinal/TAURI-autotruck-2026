import { KeyboardEvent } from 'react';
import styles from './RuleToggle.module.css';

export interface RuleToggleProps {
  nombre: string;
  descripcion: string;
  activa: boolean;
  cargando: boolean;
  onToggle: () => void;
}

export function RuleToggle({
  nombre,
  descripcion,
  activa,
  cargando,
  onToggle,
}: RuleToggleProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!cargando) onToggle();
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.content}>
        <h3 className={styles.nombre}>{nombre}</h3>
        <p className={styles.descripcion}>{descripcion}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activa}
        aria-label={nombre}
        disabled={cargando}
        className={`${styles.switch} ${activa ? styles.switchOn : styles.switchOff} ${cargando ? styles.switchDisabled : ''}`}
        onClick={() => {
          if (!cargando) onToggle();
        }}
        onKeyDown={handleKeyDown}
      >
        <span className={`${styles.thumb} ${activa ? styles.thumbOn : ''}`}>
          {cargando && <span className={styles.spinner} aria-hidden />}
        </span>
      </button>
    </article>
  );
}
