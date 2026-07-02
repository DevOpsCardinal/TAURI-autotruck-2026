import { Loader2, Printer, X } from 'lucide-react';
import { useEffect } from 'react';
import type {
  DespachoRecord,
  DetailRecord,
  DetailType,
  IngresoRecord,
  TransitHistoryRecord,
} from '../../types/reports.types';
import { displayValue, formatWeight } from '../../utils/reports.utils';
import { StatusBadge } from '../ReportTable/ReportTable';
import styles from './ReportDetailPanel.module.css';

interface ReportDetailPanelProps {
  record: DetailRecord | null;
  type: DetailType | null;
  open: boolean;
  onClose: () => void;
  onPrint?: () => void;
  printing?: boolean;
  canPrint?: boolean;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

function DetailRow({
  label,
  value,
  numeric,
  highlight,
}: {
  label: string;
  value: string | number | null | undefined;
  numeric?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span
        className={`${numeric ? styles.rowValueNumeric : styles.rowValue} ${highlight ? styles.netoHighlight : ''}`}
      >
        {displayValue(value)}
      </span>
    </div>
  );
}

function IngresoDetail({ record }: { record: IngresoRecord }) {
  return (
    <>
      <DetailSection title="Pesaje">
        <DetailRow label="Bruto" value={`${formatWeight(record.bruto)} kg`} numeric />
        <DetailRow label="Tara" value={`${formatWeight(record.tara)} kg`} numeric />
        <DetailRow label="Neto" value={`${formatWeight(record.neto)} kg`} numeric highlight />
      </DetailSection>
      <DetailSection title="Vehículo">
        <DetailRow label="Placa" value={record.placa?.toUpperCase()} />
        <DetailRow label="Conductor" value={record.conductor} />
        <DetailRow label="Cédula" value={record.cedula} />
        <DetailRow label="Transportadora" value={record.transportadora} />
      </DetailSection>
      <DetailSection title="Mercancía">
        <DetailRow label="Materia Prima" value={record.materia_prima} />
        <DetailRow label="Proveedor" value={record.proveedor} />
        <DetailRow label="Origen" value={record.origen} />
        <DetailRow label="Planta" value={record.planta} />
      </DetailSection>
      <DetailSection title="Tiempos">
        <DetailRow label="Pesaje vacío" value={`${displayValue(record.fecha_peso_vacio)} ${displayValue(record.hora_peso_vacio)}`} />
        <DetailRow label="Pesaje lleno" value={`${displayValue(record.fecha_peso_lleno)} ${displayValue(record.hora_peso_lleno)}`} />
      </DetailSection>
      <DetailSection title="Referencias">
        <DetailRow label="No. Sello" value={record.no_sello} />
        <DetailRow label="No. Shipment" value={record.no_shipment} />
        <DetailRow label="No. R" value={record.no_r} />
        <DetailRow label="No. Contenedor" value={record.no_contenedor} />
      </DetailSection>
      <DetailSection title="Operario">
        <DetailRow label="Nombre" value={record.operario} />
        <DetailRow label="Usuario" value={record.nick_operario} />
        <DetailRow label="Registrado" value={record.created_at} />
      </DetailSection>
      <DetailSection title="Observaciones">
        <DetailRow label="" value={record.observaciones ?? '—'} />
      </DetailSection>
    </>
  );
}

function DespachoDetail({ record }: { record: DespachoRecord }) {
  return (
    <>
      <DetailSection title="Pesaje">
        <DetailRow label="Bruto" value={`${formatWeight(record.bruto)} kg`} numeric />
        <DetailRow label="Tara" value={`${formatWeight(record.tara)} kg`} numeric />
        <DetailRow label="Neto" value={`${formatWeight(record.neto)} kg`} numeric highlight />
      </DetailSection>
      <DetailSection title="Vehículo">
        <DetailRow label="Placa" value={record.placa?.toUpperCase()} />
        <DetailRow label="Conductor" value={record.conductor} />
        <DetailRow label="Cédula" value={record.cedula} />
        <DetailRow label="Transportadora" value={record.transportadora} />
      </DetailSection>
      <DetailSection title="Producto">
        <DetailRow label="Producto" value={record.producto} />
        <DetailRow label="Cliente" value={record.cliente} />
        <DetailRow label="NIT Cliente" value={record.nit_cliente} />
        <DetailRow label="Destino" value={record.destino} />
        <DetailRow label="Planta" value={record.planta} />
      </DetailSection>
      <DetailSection title="Tiempos">
        <DetailRow label="Pesaje vacío" value={`${displayValue(record.fecha_peso_vacio)} ${displayValue(record.hora_peso_vacio)}`} />
        <DetailRow label="Pesaje lleno" value={`${displayValue(record.fecha_peso_lleno)} ${displayValue(record.hora_peso_lleno)}`} />
      </DetailSection>
      <DetailSection title="Referencias">
        <DetailRow label="No. Sello" value={record.no_sello} />
        <DetailRow label="No. Shipment" value={record.no_shipment} />
        <DetailRow label="No. R" value={record.no_r} />
        <DetailRow label="No. Contenedor" value={record.no_contenedor} />
      </DetailSection>
      <DetailSection title="Operario">
        <DetailRow label="Nombre" value={record.operario} />
        <DetailRow label="Usuario" value={record.nick_operario} />
        <DetailRow label="Registrado" value={record.created_at} />
      </DetailSection>
      <DetailSection title="Observaciones">
        <DetailRow label="" value={record.observaciones ?? '—'} />
      </DetailSection>
    </>
  );
}

function TransitDetail({ record }: { record: TransitHistoryRecord }) {
  const pesajePending = record.estado === 'EN_TRANSITO';

  return (
    <>
      {record.estado === 'CANCELADO' ? (
        <div className={styles.alert}>
          <strong>Motivo de cancelación:</strong>{' '}
          {record.motivo_cancelacion ?? 'Sin motivo registrado'}
          <br />
          <strong>Cancelado en:</strong> {displayValue(record.cancelado_en)}
        </div>
      ) : null}

      <DetailSection title="Pesaje">
        {pesajePending ? (
          <DetailRow label="" value="Pendiente de segundo pesaje" />
        ) : (
          <>
            <DetailRow label="Bruto" value={`${formatWeight(record.bruto)} kg`} numeric />
            <DetailRow label="Tara" value={`${formatWeight(record.tara)} kg`} numeric />
            <DetailRow label="Neto" value={`${formatWeight(record.neto)} kg`} numeric highlight />
          </>
        )}
      </DetailSection>
      <DetailSection title="Vehículo">
        <DetailRow label="Placa" value={record.placa?.toUpperCase()} />
        <DetailRow label="Conductor" value={record.conductor} />
        <DetailRow label="Cédula" value={record.cedula} />
        <DetailRow label="Tipo Vehículo" value={record.tipo_vehiculo} />
        <DetailRow label="Transportadora" value={record.transportadora} />
      </DetailSection>
      <DetailSection title={record.caso === 'Ingreso' ? 'Mercancía' : 'Producto'}>
        <DetailRow label={record.caso === 'Ingreso' ? 'Materia Prima / Producto' : 'Producto'} value={record.materia_prima_producto} />
        <DetailRow label="Contraparte" value={record.cliente_proveedor} />
        <DetailRow label={record.caso === 'Ingreso' ? 'Origen' : 'Destino'} value={record.origen_destino} />
        <DetailRow label="Planta" value={record.planta} />
      </DetailSection>
      <DetailSection title="Tiempos">
        <DetailRow label="Entrada a tránsito" value={record.created_at} />
        <DetailRow label="Completado en" value={record.completado_en} />
        <DetailRow label="Cancelado en" value={record.cancelado_en} />
      </DetailSection>
      <DetailSection title="Referencias">
        <DetailRow label="No. Sello" value={record.no_sello} />
        <DetailRow label="No. Shipment" value={record.no_shipment} />
        <DetailRow label="No. R" value={record.no_r} />
        <DetailRow label="No. Contenedor" value={record.no_contenedor} />
      </DetailSection>
      <DetailSection title="Operario">
        <DetailRow label="Nombre" value={record.operario} />
        <DetailRow label="Usuario" value={record.nick_operario} />
      </DetailSection>
      {record.observaciones ? (
        <DetailSection title="Observaciones">
          <DetailRow label="" value={record.observaciones} />
        </DetailSection>
      ) : null}
    </>
  );
}

function getTitle(type: DetailType, record: DetailRecord): string {
  if (type === 'ingreso') return `Tiquete de Ingreso #${(record as IngresoRecord).no_tiquete}`;
  if (type === 'despacho') return `Tiquete de Despacho #${(record as DespachoRecord).no_tiquete}`;
  const t = record as TransitHistoryRecord;
  return `${t.caso} — ${t.no_interno ?? t.id}`;
}

export function ReportDetailPanel({
  record,
  type,
  open,
  onClose,
  onPrint,
  printing = false,
  canPrint = true,
}: ReportDetailPanelProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !record || !type) return null;

  const showPrint = type !== 'transit' || (
    (record as TransitHistoryRecord).estado === 'COMPLETADO'
    && (record as TransitHistoryRecord).no_tiquete != null
  );

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden />
      <aside className={styles.panel} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <div>
            <h2>{getTitle(type, record)}</h2>
            {type === 'transit' ? (
              <div className={styles.badgeRow}>
                <StatusBadge estado={(record as TransitHistoryRecord).estado} />
              </div>
            ) : null}
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {type === 'ingreso' ? <IngresoDetail record={record as IngresoRecord} /> : null}
          {type === 'despacho' ? <DespachoDetail record={record as DespachoRecord} /> : null}
          {type === 'transit' ? <TransitDetail record={record as TransitHistoryRecord} /> : null}
        </div>

        {showPrint && onPrint ? (
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.printButton}
              onClick={onPrint}
              disabled={!canPrint || printing}
            >
              {printing ? <Loader2 size={16} className="spin" /> : <Printer size={16} />}
              Reimprimir Tiquete
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}
