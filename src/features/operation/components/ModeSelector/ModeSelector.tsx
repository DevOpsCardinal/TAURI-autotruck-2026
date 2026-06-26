import { OperationMode } from '../../types/operation.types';
import styles from './ModeSelector.module.css';

interface ModeSelectorProps {
  mode: OperationMode | null;
  onModeChange: (mode: OperationMode) => void;
  activeScale: 1 | 2;
  onScaleChange: (scale: 1 | 2) => void;
  isConnected: boolean;
}

const MODES: { id: OperationMode; label: string }[] = [
  { id: 'ingreso', label: 'Ingreso' },
  { id: 'despacho', label: 'Despacho' },
  { id: 'transito', label: 'Tránsito' },
];

export function ModeSelector({
  mode,
  onModeChange,
  activeScale,
  onScaleChange,
  isConnected,
}: ModeSelectorProps) {
  return (
    <div className={styles.controlBar}>
      <div className={styles.modeGroup} role="radiogroup" aria-label="Modo de operación">
        {MODES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={mode === item.id}
            className={`${styles.modeButton} ${mode === item.id ? styles.modeButtonActive : ''} ${
              index === 0 ? styles.modeButtonFirst : index === MODES.length - 1 ? styles.modeButtonLast : ''
            }`}
            onClick={() => onModeChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={styles.scaleGroup} role="radiogroup" aria-label="Báscula activa">
        <span className={styles.scaleHeading}>Báscula</span>
        <span
          className={`${styles.connectionDot} ${isConnected ? styles.connected : styles.disconnected}`}
          aria-hidden
        />
        {([1, 2] as const).map((scale) => (
          <button
            key={scale}
            type="button"
            role="radio"
            aria-checked={activeScale === scale}
            className={`${styles.scaleButton} ${activeScale === scale ? styles.scaleButtonActive : ''}`}
            onClick={() => onScaleChange(scale)}
          >
            {scale}
          </button>
        ))}
      </div>
    </div>
  );
}
