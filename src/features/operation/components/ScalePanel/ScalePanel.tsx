import { AlertTriangle } from 'lucide-react';
import { OperationMode, TransitRecord } from '../../types/operation.types';
import styles from './ScalePanel.module.css';

interface ScalePanelProps {
  liveWeight: number;
  activeScale: 1 | 2;
  mode: OperationMode | null;
  transitRecord: TransitRecord | null;
  isConnected: boolean;
}

const numberFormat = new Intl.NumberFormat('es-CO');

function computeValues(
  mode: OperationMode | null,
  transitRecord: TransitRecord | null,
  liveWeight: number,
) {
  if (mode === 'ingreso' && !transitRecord) {
    return { tara: 0, bruto: liveWeight, neto: 0 };
  }
  if (mode === 'ingreso' && transitRecord) {
    return {
      tara: liveWeight,
      bruto: transitRecord.bruto,
      neto: transitRecord.bruto - liveWeight,
    };
  }
  if (mode === 'despacho' && !transitRecord) {
    return { tara: liveWeight, bruto: 0, neto: 0 };
  }
  if (mode === 'despacho' && transitRecord) {
    return {
      tara: transitRecord.tara,
      bruto: liveWeight,
      neto: liveWeight - transitRecord.tara,
    };
  }
  if (mode === 'transito' && transitRecord?.caso === 'Ingreso') {
    return {
      tara: liveWeight,
      bruto: transitRecord.bruto,
      neto: transitRecord.bruto - liveWeight,
    };
  }
  if (mode === 'transito' && transitRecord?.caso === 'Despacho') {
    return {
      tara: transitRecord.tara,
      bruto: liveWeight,
      neto: liveWeight - transitRecord.tara,
    };
  }
  return { tara: 0, bruto: 0, neto: 0 };
}

function getFirstWeightLabel(mode: OperationMode | null, transitRecord: TransitRecord | null): string | null {
  if (!transitRecord) return null;
  if (mode === 'transito' && transitRecord.caso === 'Ingreso') return 'Peso Bruto registrado';
  if (mode === 'transito' && transitRecord.caso === 'Despacho') return 'Peso Tara registrado';
  return null;
}

export function ScalePanel({
  liveWeight,
  activeScale,
  mode,
  transitRecord,
  isConnected,
}: ScalePanelProps) {
  const { tara, bruto, neto } = computeValues(mode, transitRecord, liveWeight);
  const netoNegative = neto < 0;
  const firstWeightLabel = getFirstWeightLabel(mode, transitRecord);

  return (
    <aside className={styles.panel} aria-label="Panel de báscula">
      <div className={styles.header}>
        <h2 className={styles.title}>Báscula {activeScale}</h2>
        <span className={styles.connection}>
          <span
            className={`${styles.connectionDot} ${isConnected ? styles.connected : styles.disconnected}`}
            aria-hidden
          />
          {isConnected ? 'Conectado' : 'Sin señal'}
        </span>
      </div>

      {firstWeightLabel && transitRecord && (
        <div className={styles.registeredWeight}>
          <span className={styles.registeredLabel}>{firstWeightLabel}</span>
          <span className={styles.registeredValue}>
            {numberFormat.format(
              transitRecord.caso === 'Ingreso' ? transitRecord.bruto : transitRecord.tara,
            )}{' '}
            kg
          </span>
          <span className={styles.registeredTime}>
            {transitRecord.fecha_peso_vacio} {transitRecord.hora_peso_vacio}
          </span>
        </div>
      )}

      <div className={styles.liveDisplay}>
        <div className={styles.liveRow}>
          <span className={styles.liveValue}>{numberFormat.format(liveWeight)}</span>
          <span className={styles.liveUnit}>kg</span>
        </div>
        <span className={styles.liveCaption}>
          {transitRecord ? 'peso de salida en tiempo real' : 'lectura en tiempo real'}
        </span>
      </div>

      <div className={styles.splitRow}>
        <div className={styles.miniBlock}>
          <span className={styles.miniLabel}>Tara</span>
          <div className={styles.miniCard}>
            <span className={styles.miniValue}>{numberFormat.format(tara)} kg</span>
          </div>
        </div>
        <div className={styles.miniBlock}>
          <span className={styles.miniLabel}>Bruto</span>
          <div className={styles.miniCard}>
            <span className={styles.miniValue}>{numberFormat.format(bruto)} kg</span>
          </div>
        </div>
      </div>

      <div className={styles.netoBlock}>
        <span className={styles.miniLabel}>Neto</span>
        <div className={styles.netoCard}>
          <span
            className={`${styles.netoValue} ${netoNegative ? styles.netoWarn : styles.netoOk}`}
          >
            {netoNegative && <AlertTriangle size={16} aria-hidden />}
            {numberFormat.format(neto)} kg
          </span>
        </div>
      </div>
    </aside>
  );
}
