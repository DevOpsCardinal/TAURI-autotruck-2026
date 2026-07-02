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

  const refs: Array<{ label: string; value: string }> = [];
  if (data.referencias.no_sello) refs.push({ label: 'No. SELLO', value: data.referencias.no_sello });
  if (data.referencias.no_shipment) refs.push({ label: 'SHIPMENT', value: data.referencias.no_shipment });
  if (data.referencias.no_contenedor) refs.push({ label: 'CONTENEDOR', value: data.referencias.no_contenedor });
  if (data.referencias.no_r) refs.push({ label: 'No. R', value: data.referencias.no_r });

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
          {data.empresa.nombre && <div className={styles.headerEmpresa}>{data.empresa.nombre}</div>}
          {data.empresa.nit && <div className={styles.headerNit}>NIT: {data.empresa.nit}</div>}
          {(data.empresa.direccion || data.empresa.ciudad) && (
            <div className={styles.headerAddress}>
              {data.empresa.direccion}{data.empresa.ciudad ? ` — ${data.empresa.ciudad}` : ''}
            </div>
          )}
        </div>
        <div className={styles.headerRight}>
          <div className={styles.headerTitle}>BÁSCULA DE PESAJE</div>
          <div className={styles.ticketNumber}>N. {data.tiquete.numero || '—'}</div>
        </div>
      </div>

      {/* TABLA DE DATOS */}
      <table className={styles.dataTable}>
        <tbody>
          {/* Vehículo + Fechas/Pesos de entrada y salida */}
          <tr>
            <td className={styles.label}>PLACA</td>
            <td className={styles.val}>{data.vehiculo.placa || '—'}</td>
            <td className={styles.label}>FECHA ENTRADA</td>
            <td className={styles.val}>
              {data.pesaje.fecha_primer_pesaje || '—'}
              {data.pesaje.hora_primer_pesaje ? `  ${data.pesaje.hora_primer_pesaje}` : ''}
            </td>
          </tr>
          <tr>
            <td className={styles.label}>CONDUCTOR ID</td>
            <td className={styles.val}>{data.conductor.cedula || '—'}</td>
            <td className={styles.label}>PESO ENTRADA</td>
            <td className={styles.valBold}>{formatWeightValue(entrada)} kg</td>
          </tr>
          <tr>
            <td className={styles.label}>TRANSPORTADORA</td>
            <td className={styles.val}>{data.vehiculo.transportadora || '—'}</td>
            <td className={styles.label}>FECHA SALIDA</td>
            <td className={styles.val}>
              {preliminar ? '—' : (data.pesaje.fecha_segundo_pesaje || '—')}
              {!preliminar && data.pesaje.hora_segundo_pesaje ? `  ${data.pesaje.hora_segundo_pesaje}` : ''}
            </td>
          </tr>
          <tr className={styles.sectionEnd}>
            <td className={styles.label}>CONDUCTOR</td>
            <td className={styles.val}>{data.conductor.nombre || '—'}</td>
            <td className={styles.label}>PESO SALIDA</td>
            <td className={styles.valBold}>{preliminar ? '—' : `${formatWeightValue(salida)} kg`}</td>
          </tr>

          {/* Producto y movimiento */}
          <tr>
            <td className={styles.label}>{materialLabel}</td>
            <td className={styles.val}>{data.mercancia.descripcion || '—'}</td>
            <td className={styles.label}>MOVIMIENTO</td>
            <td className={styles.val}>{data.tiquete.codigo_visual || '—'}</td>
          </tr>
          <tr>
            <td className={styles.label}>{contraparteLabel}</td>
            <td className={styles.val}>{data.mercancia.contraparte || '—'}</td>
            <td className={styles.labelNeto}>PESO NETO</td>
            <td className={styles.valNeto}>
              {preliminar ? 'PENDIENTE' : formatWeightKg(data.pesaje.neto_kg)}
            </td>
          </tr>
          <tr>
            <td className={styles.label}>{origenDestinoLabel}</td>
            <td className={styles.val}>{data.mercancia.origen_destino || '—'}</td>
            <td className={styles.label}></td>
            <td></td>
          </tr>
          <tr className={styles.sectionEnd}>
            <td className={styles.label}>PLANTA</td>
            <td className={styles.val}>{data.mercancia.planta || '—'}</td>
            <td className={styles.label}></td>
            <td></td>
          </tr>

          {/* Referencias opcionales */}
          {refs.length > 0 && (
            <tr className={refs.length <= 2 ? styles.sectionEnd : undefined}>
              <td className={styles.label}>{refs[0].label}</td>
              <td className={styles.val}>{refs[0].value}</td>
              {refs[1] ? (
                <>
                  <td className={styles.label}>{refs[1].label}</td>
                  <td className={styles.val}>{refs[1].value}</td>
                </>
              ) : (
                <>
                  <td className={styles.label}></td>
                  <td></td>
                </>
              )}
            </tr>
          )}
          {refs.length > 2 && (
            <tr className={styles.sectionEnd}>
              <td className={styles.label}>{refs[2].label}</td>
              <td className={styles.val}>{refs[2].value}</td>
              {refs[3] ? (
                <>
                  <td className={styles.label}>{refs[3].label}</td>
                  <td className={styles.val}>{refs[3].value}</td>
                </>
              ) : (
                <>
                  <td className={styles.label}></td>
                  <td></td>
                </>
              )}
            </tr>
          )}

          {/* Observaciones */}
          <tr>
            <td className={styles.label}>OBSERVACIONES</td>
            <td colSpan={3} className={styles.val}>{data.observaciones || ''}</td>
          </tr>

          {/* Báscula y operario */}
          <tr>
            <td className={styles.label}>BÁSCULA</td>
            <td className={styles.val}>{data.bascula || '—'}</td>
            <td className={styles.label}>OPERARIO</td>
            <td className={styles.val}>{data.operario.nombre || '—'}</td>
          </tr>
        </tbody>
      </table>

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
