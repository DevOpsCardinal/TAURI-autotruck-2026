import type { TicketData } from '../../types/ticket.types';
import {
  formatLongDate,
  formatWeightKg,
  formatWeightValue,
  getEmpresaInitials,
  getEntradaSalidaPesos,
  getTicketDisplayDate,
  isPreliminary,
  resolveLogoUrl,
} from '../../utils/ticketFormat.utils';
import styles from './TicketCorporativo.module.css';

interface TicketCorporativoProps {
  data: TicketData;
  printTarget?: boolean;
}

function RefField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}: </span>
      <strong>{value}</strong>
    </div>
  );
}

export function TicketCorporativo({ data, printTarget = false }: TicketCorporativoProps) {
  const preliminar = isPreliminary(data.tiquete.estado);
  const logoUrl = resolveLogoUrl(data.empresa.logo_path);
  const { entrada, salida } = getEntradaSalidaPesos(data);
  const displayDate = formatLongDate(getTicketDisplayDate(data));
  const materialHeader = data.tiquete.tipo_operacion === 'Ingreso' ? 'MATERIAL' : 'PRODUCTO';
  const contraparteHeader = data.mercancia.contraparte_label.toUpperCase();
  const origenDestinoHeader = data.mercancia.origen_destino_label.toUpperCase();

  return (
    <div className={`${styles.ticketCorporativo}${printTarget ? ' print-target' : ''}`}>
      <div className={styles.headerBand}>
        {logoUrl ? (
          <img src={logoUrl} alt={data.empresa.nombre} width={40} height={40} className={styles.logo} />
        ) : (
          <div className={styles.logoFallback}>{getEmpresaInitials(data.empresa.nombre || 'E')}</div>
        )}
        <div className={styles.headerText}>
          <div className={styles.empresaNombre}>{data.empresa.nombre || '—'}</div>
          {data.empresa.nit ? <div>NIT: {data.empresa.nit}</div> : null}
          {(data.empresa.direccion || data.empresa.ciudad) ? (
            <div>{[data.empresa.direccion, data.empresa.ciudad].filter(Boolean).join(' — ')}</div>
          ) : null}
          {data.empresa.telefono ? <div>Tel: {data.empresa.telefono}</div> : null}
        </div>
      </div>

      <div className={styles.docTitle}>
        TIQUETE DE PESAJE — {data.tiquete.tipo_operacion.toUpperCase()}
      </div>
      <div className={styles.docMeta}>
        <span>No. {data.tiquete.codigo_visual}</span>
        <span>{displayDate}</span>
      </div>

      {preliminar ? (
        <div className={styles.preliminarBanner}>⚠ TICKET PRELIMINAR — PESO FINAL PENDIENTE</div>
      ) : null}
      {data.tiquete.estado === 'REIMPRESION' ? (
        <div className={styles.reimpresionBanner}>REIMPRESIÓN</div>
      ) : null}

      <div className={styles.section}>
        <div className={styles.sectionHeading}>Vehículo y Conductor</div>
        <table className={styles.dataTable}>
          <tbody>
            <tr>
              <th>PLACA</th>
              <th>TIPO DE VEHÍCULO</th>
            </tr>
            <tr>
              <td>{data.vehiculo.placa}</td>
              <td>{data.vehiculo.tipo || '—'}</td>
            </tr>
            <tr>
              <th>TRANSPORTADORA</th>
              <th>CONDUCTOR</th>
            </tr>
            <tr>
              <td>{data.vehiculo.transportadora || '—'}</td>
              <td>{data.conductor.nombre}</td>
            </tr>
            <tr>
              <th colSpan={2}>CÉDULA</th>
            </tr>
            <tr>
              <td colSpan={2}>{data.conductor.cedula || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeading}>Mercancía</div>
        <table className={styles.dataTable}>
          <tbody>
            <tr>
              <th>{materialHeader}</th>
              <th>{contraparteHeader}</th>
            </tr>
            <tr>
              <td>{data.mercancia.descripcion || '—'}</td>
              <td>{data.mercancia.contraparte || '—'}</td>
            </tr>
            <tr>
              <th>PLANTA</th>
              <th>{origenDestinoHeader}</th>
            </tr>
            <tr>
              <td>{data.mercancia.planta || '—'}</td>
              <td>{data.mercancia.origen_destino || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeading}>Pesaje</div>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th />
              <th>ENTRADA</th>
              <th>SALIDA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Fecha</th>
              <td>{data.pesaje.fecha_primer_pesaje || '—'}</td>
              <td>{preliminar ? '---' : (data.pesaje.fecha_segundo_pesaje ?? '—')}</td>
            </tr>
            <tr>
              <th>Hora</th>
              <td>{data.pesaje.hora_primer_pesaje || '—'}</td>
              <td>{preliminar ? '---' : (data.pesaje.hora_segundo_pesaje ?? '—')}</td>
            </tr>
            <tr>
              <th>Peso (kg)</th>
              <td>{formatWeightValue(entrada)}</td>
              <td>{preliminar ? '---' : formatWeightValue(salida)}</td>
            </tr>
          </tbody>
        </table>
        <div className={preliminar ? styles.pesoNetoPending : styles.pesoNeto}>
          PESO NETO: {preliminar ? 'PENDIENTE' : formatWeightKg(data.pesaje.neto_kg)}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeading}>Referencias y Observaciones</div>
        <div className={styles.refGrid}>
          {data.referencias.no_sello ? (
            <RefField label="No. Sello" value={data.referencias.no_sello} />
          ) : null}
          <RefField label="Báscula" value={data.bascula || '—'} />
          {data.referencias.no_shipment ? (
            <RefField label="Shipment" value={data.referencias.no_shipment} />
          ) : null}
          {data.referencias.no_contenedor ? (
            <RefField label="Contenedor" value={data.referencias.no_contenedor} />
          ) : null}
          {data.referencias.no_r ? (
            <RefField label="No. R" value={data.referencias.no_r} />
          ) : null}
          {data.observaciones ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <RefField label="Observaciones" value={data.observaciones} />
            </div>
          ) : null}
          <div style={{ gridColumn: '1 / -1' }}>
            <RefField label="Operario" value={`${data.operario.nombre} (${data.operario.nick})`} />
          </div>
        </div>
      </div>

      <div className={styles.signatureArea}>
        <div>
          <div className={styles.signatureLine}>PESADO POR — Nombre / Firma</div>
        </div>
        <div>
          <div className={styles.signatureLine}>RECIBIDO POR — Nombre / Firma</div>
        </div>
      </div>

      <div className={styles.qrSection}>
        <div id="ticket-qr-placeholder" className={styles.qrPlaceholder}>QR</div>
        <div>{data.tiquete.codigo_visual}</div>
      </div>
    </div>
  );
}
