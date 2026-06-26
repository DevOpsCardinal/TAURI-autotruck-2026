import type { TicketData } from '../../types/ticket.types';
import {
  formatWeightKg,
  formatWeightValue,
  getEmpresaInitials,
  getEntradaSalidaPesos,
  isPreliminary,
  resolveLogoUrl,
} from '../../utils/ticketFormat.utils';
import styles from './TicketMediaHoja.module.css';

interface TicketMediaHojaProps {
  data: TicketData;
  printTarget?: boolean;
}

export function TicketMediaHoja({ data, printTarget = false }: TicketMediaHojaProps) {
  const preliminar = isPreliminary(data.tiquete.estado);
  const { entrada, salida } = getEntradaSalidaPesos(data);
  const logoUrl = resolveLogoUrl(data.empresa.logo_path);
  const isIngreso = data.tiquete.tipo_operacion === 'Ingreso';
  const materialLabel = isIngreso ? 'MATERIA PRIMA' : 'PRODUCTO';
  const contraparteLabel = data.mercancia.contraparte_label.toUpperCase();
  const origenDestinoLabel = data.mercancia.origen_destino_label.toUpperCase();

  return (
    <div className={`${styles.ticket}${printTarget ? ' print-target' : ''}`}>

      {preliminar ? (
        <div className={styles.stateBanner}>⚠ PRELIMINAR — PESO FINAL PENDIENTE</div>
      ) : data.tiquete.estado === 'REIMPRESION' ? (
        <div className={styles.stateBannerReprint}>REIMPRESIÓN</div>
      ) : null}

      {/* ENCABEZADO */}
      <div className={styles.header}>
        <div className={styles.logoArea}>
          {logoUrl ? (
            <img src={logoUrl} alt={data.empresa.nombre} className={styles.logo} />
          ) : (
            <div className={styles.logoFallback}>{getEmpresaInitials(data.empresa.nombre || 'E')}</div>
          )}
        </div>
        <div className={styles.headerCenter}>
          <div className={styles.headerTitle}>BÁSCULA DE PESAJE</div>
          {data.empresa.nombre ? <div className={styles.headerEmpresa}>{data.empresa.nombre}</div> : null}
          {data.empresa.nit ? <div className={styles.headerNit}>NIT: {data.empresa.nit}</div> : null}
        </div>
      </div>

      {/* TABLA DE MOVIMIENTO */}
      <table className={styles.moveTable}>
        <thead>
          <tr>
            <th rowSpan={2} className={styles.colRegistro}>REGISTRO No.</th>
            <th colSpan={3} className={styles.colMovHead}>MOVIMIENTO</th>
            <th rowSpan={2} className={styles.colTiquete}>TIQUETE No.</th>
            <th rowSpan={2} className={styles.colNeto}>PESO NETO</th>
          </tr>
          <tr>
            <th className={styles.colFecha}>FECHA</th>
            <th className={styles.colHora}>HORA</th>
            <th className={styles.colPeso}>PESO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={2} className={styles.tdRegistro}>{data.tiquete.codigo_visual}</td>
            <td>{data.pesaje.fecha_primer_pesaje || '—'}</td>
            <td>{data.pesaje.hora_primer_pesaje || '—'}</td>
            <td className={styles.tdPesoCell}>
              {formatWeightValue(entrada)}
              <span className={styles.movLabel}> ENT.</span>
            </td>
            <td rowSpan={2} className={styles.tdTiquete}>{data.tiquete.numero || '—'}</td>
            <td rowSpan={2} className={preliminar ? styles.tdNetoPending : styles.tdNeto}>
              {preliminar ? 'PENDIENTE' : formatWeightKg(data.pesaje.neto_kg)}
            </td>
          </tr>
          <tr>
            <td>{preliminar ? '—' : (data.pesaje.fecha_segundo_pesaje || '—')}</td>
            <td>{preliminar ? '—' : (data.pesaje.hora_segundo_pesaje || '—')}</td>
            <td className={styles.tdPesoCell}>
              {preliminar ? '—' : formatWeightValue(salida)}
              {!preliminar ? <span className={styles.movLabel}> SAL.</span> : null}
            </td>
          </tr>
        </tbody>
      </table>

      {/* SECCIÓN DE DATOS */}
      <div className={styles.infoSection}>
        <table className={styles.infoLeft}>
          <tbody>
            <tr>
              <td className={styles.infoLabel}>{materialLabel}</td>
              <td className={styles.infoValue}>{data.mercancia.descripcion || '—'}</td>
            </tr>
            <tr>
              <td className={styles.infoLabel}>{contraparteLabel}</td>
              <td className={styles.infoValue}>{data.mercancia.contraparte || '—'}</td>
            </tr>
            <tr>
              <td className={styles.infoLabel}>{origenDestinoLabel}</td>
              <td className={styles.infoValue}>{data.mercancia.origen_destino || '—'}</td>
            </tr>
            <tr>
              <td className={styles.infoLabel}>PLANTA</td>
              <td className={styles.infoValue}>{data.mercancia.planta || '—'}</td>
            </tr>
            <tr>
              <td className={styles.infoLabel}>PLACA</td>
              <td className={styles.infoValue}>{data.vehiculo.placa || '—'}</td>
            </tr>
            <tr>
              <td className={styles.infoLabel}>CONDUCTOR ID</td>
              <td className={styles.infoValue}>{data.conductor.cedula || '—'}</td>
            </tr>
            {data.referencias.no_sello ? (
              <tr>
                <td className={styles.infoLabel}>No. SELLO</td>
                <td className={styles.infoValue}>{data.referencias.no_sello}</td>
              </tr>
            ) : null}
            {data.referencias.no_shipment ? (
              <tr>
                <td className={styles.infoLabel}>SHIPMENT</td>
                <td className={styles.infoValue}>{data.referencias.no_shipment}</td>
              </tr>
            ) : null}
            {data.referencias.no_contenedor ? (
              <tr>
                <td className={styles.infoLabel}>CONTENEDOR</td>
                <td className={styles.infoValue}>{data.referencias.no_contenedor}</td>
              </tr>
            ) : null}
            {data.referencias.no_r ? (
              <tr>
                <td className={styles.infoLabel}>No. R</td>
                <td className={styles.infoValue}>{data.referencias.no_r}</td>
              </tr>
            ) : null}
            <tr>
              <td className={styles.infoLabel}>BÁSCULA</td>
              <td className={styles.infoValue}>{data.bascula || '—'}</td>
            </tr>
            {data.observaciones ? (
              <tr>
                <td className={styles.infoLabel}>OBSERVACIONES</td>
                <td className={styles.infoValue}>{data.observaciones}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <table className={styles.infoRight}>
          <tbody>
            <tr>
              <td className={styles.infoLabel}>TRANSPORT.</td>
              <td className={styles.infoValue}>{data.vehiculo.transportadora || '—'}</td>
            </tr>
            <tr>
              <td className={styles.infoLabel}>CONDUCTOR</td>
              <td className={styles.infoValue}>{data.conductor.nombre || '—'}</td>
            </tr>
            <tr>
              <td className={styles.infoLabel}>OPERARIO</td>
              <td className={styles.infoValue}>{data.operario.nombre || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.spacer} />

      {/* FIRMAS */}
      <div className={styles.signatures}>
        <div className={styles.sigBlock}>
          <div className={styles.sigLine} />
          <div className={styles.sigLabel}>PESADO POR</div>
        </div>
        <div className={styles.sigBlock}>
          <div className={styles.sigLine} />
          <div className={styles.sigLabel}>RECIBIDO POR</div>
        </div>
      </div>

    </div>
  );
}
