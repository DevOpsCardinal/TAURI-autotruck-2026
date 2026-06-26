import type { TicketData } from '../../types/ticket.types';
import {
  formatWeightKg,
  getEntradaSalidaPesos,
  isPreliminary,
} from '../../utils/ticketFormat.utils';
import styles from './TicketTermico.module.css';

interface TicketTermicoProps {
  data: TicketData;
  printTarget?: boolean;
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>: {value}</span>
    </div>
  );
}

export function TicketTermico({ data, printTarget = false }: TicketTermicoProps) {
  const preliminar = isPreliminary(data.tiquete.estado);
  const materialLabel = data.tiquete.tipo_operacion === 'Ingreso' ? 'Materia Prima' : 'Producto';
  const { entrada, salida } = getEntradaSalidaPesos(data);
  const { referencias } = data;

  return (
    <div className={`${styles.ticketTermico}${printTarget ? ' print-target' : ''}`}>
      <div className={styles.header}>
        <div className={styles.empresaNombre}>{data.empresa.nombre || '—'}</div>
        {data.empresa.ciudad ? <div>{data.empresa.ciudad}</div> : null}
        {data.empresa.nit ? <div>NIT: {data.empresa.nit}</div> : null}
        {data.empresa.telefono ? <div>Tel: {data.empresa.telefono}</div> : null}
        {data.empresa.direccion ? <div>{data.empresa.direccion}</div> : null}
      </div>

      <div className={styles.divider} />

      <div className={styles.sectionTitle}>TIQUETE DE PESAJE</div>
      <div className={styles.sectionTitle}>{data.tiquete.tipo_operacion.toUpperCase()}</div>

      <div className={styles.divider} />

      {preliminar ? (
        <div className={styles.preliminarBanner}>
          ⚠ PRELIMINAR - PESO PENDIENTE
        </div>
      ) : null}
      {data.tiquete.estado === 'REIMPRESION' ? (
        <div className={styles.reimpresionBanner}>REIMPRESIÓN</div>
      ) : null}

      {preliminar || data.tiquete.estado === 'REIMPRESION' ? <div className={styles.divider} /> : null}

      <FieldRow label="No. Tiquete" value={data.tiquete.codigo_visual} />
      <FieldRow label="Fecha" value={data.pesaje.fecha_primer_pesaje || '—'} />

      <div className={styles.divider} />
      <div className={styles.sectionTitle}>VEHÍCULO</div>
      <FieldRow label="Placa" value={data.vehiculo.placa} />
      <FieldRow label="Tipo" value={data.vehiculo.tipo || '—'} />
      <FieldRow label="Transportad." value={data.vehiculo.transportadora || '—'} />

      <div className={styles.divider} />
      <div className={styles.sectionTitle}>CONDUCTOR</div>
      <FieldRow label="Nombre" value={data.conductor.nombre} />
      <FieldRow label="Cédula" value={data.conductor.cedula || '—'} />

      <div className={styles.divider} />
      <div className={styles.sectionTitle}>MERCANCÍA</div>
      <FieldRow label={materialLabel} value={data.mercancia.descripcion || '—'} />
      <FieldRow label={data.mercancia.contraparte_label} value={data.mercancia.contraparte || '—'} />
      <FieldRow label="Planta" value={data.mercancia.planta || '—'} />
      <FieldRow label={data.mercancia.origen_destino_label} value={data.mercancia.origen_destino || '—'} />

      <div className={styles.divider} />
      <div className={styles.sectionTitle}>PESOS</div>
      <div className={styles.pesosBox}>
        <div className={styles.pesoRow}>
          <span>Bruto :</span>
          <span>{formatWeightKg(data.pesaje.bruto_kg, 'termico')}</span>
        </div>
        <div className={styles.pesoRow}>
          <span>Tara  :</span>
          <span>{formatWeightKg(data.pesaje.tara_kg, 'termico')}</span>
        </div>
        <div className={styles.pesoNetoRow}>
          <span>NETO  :</span>
          <span className={preliminar ? styles.pesoNetoPending : styles.pesoNeto}>
            {preliminar ? '--- kg' : formatWeightKg(data.pesaje.neto_kg, 'termico')}
          </span>
        </div>
      </div>

      <div className={styles.divider} />
      <div className={styles.sectionTitle}>PESAJE</div>
      <FieldRow
        label="Entrada"
        value={`${data.pesaje.fecha_primer_pesaje} ${data.pesaje.hora_primer_pesaje}`.trim()}
      />
      <FieldRow
        label="Salida"
        value={
          preliminar
            ? 'PENDIENTE'
            : `${data.pesaje.fecha_segundo_pesaje ?? ''} ${data.pesaje.hora_segundo_pesaje ?? ''}`.trim()
        }
      />
      {!preliminar ? (
        <div className={styles.row}>
          <span className={styles.label}>Peso Ent.</span>
          <span className={styles.value}>: {formatWeightKg(entrada, 'termico')}</span>
        </div>
      ) : null}
      {!preliminar ? (
        <div className={styles.row}>
          <span className={styles.label}>Peso Sal.</span>
          <span className={styles.value}>: {formatWeightKg(salida, 'termico')}</span>
        </div>
      ) : null}

      {(referencias.no_sello || referencias.no_shipment || referencias.no_r || referencias.no_contenedor) ? (
        <>
          <div className={styles.divider} />
          {referencias.no_sello ? <FieldRow label="No. Sello" value={referencias.no_sello} /> : null}
          {referencias.no_shipment ? <FieldRow label="Shipment" value={referencias.no_shipment} /> : null}
          {referencias.no_r ? <FieldRow label="No. R" value={referencias.no_r} /> : null}
          {referencias.no_contenedor ? <FieldRow label="Contenedor" value={referencias.no_contenedor} /> : null}
        </>
      ) : null}

      {data.observaciones ? (
        <>
          <div className={styles.divider} />
          <FieldRow label="Obs" value={data.observaciones} />
        </>
      ) : null}

      <div className={styles.divider} />
      <FieldRow label="Operario" value={`${data.operario.nombre} (${data.operario.nick})`} />
      <FieldRow label="Báscula" value={data.bascula || '—'} />

      <div className={styles.divider} />
      <div className={styles.qrSection}>
        <div id="ticket-qr-placeholder" className={styles.qrPlaceholder}>QR</div>
        <span>{data.tiquete.codigo_visual}</span>
      </div>

      <div className={styles.signatures}>
        <div className={styles.signatureBlock}>
          <div>PESADO POR:</div>
          <div className={styles.signatureLine} />
        </div>
        <div className={styles.signatureBlock}>
          <div>FIRMA:</div>
          <div className={styles.signatureLine} />
        </div>
      </div>
    </div>
  );
}
