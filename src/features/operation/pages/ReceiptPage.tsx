import { useLocation, useNavigate } from 'react-router-dom';
import { SalidaResponse } from '../types/operation.types';

const numberFormat = new Intl.NumberFormat('es-CO');

export function ReceiptPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const salida = (location.state as { salida?: SalidaResponse } | null)?.salida;

  if (!salida) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Recibo no disponible</h1>
        <p style={mutedStyle}>No se encontraron datos de la operación.</p>
        <button type="button" style={buttonStyle} onClick={() => navigate('/operation')}>
          Volver a operaciones
        </button>
      </div>
    );
  }

  const mercancia =
    salida.tipo_operacion === 'Ingreso' ? salida.materia_prima : salida.producto;
  const contraparte =
    salida.tipo_operacion === 'Ingreso' ? salida.proveedor : salida.cliente;

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>
        {salida.tipo_operacion} — Tiquete No. {salida.no_tiquete}
      </h1>

      <div style={cardStyle}>
        <Row label="Placa" value={salida.placa} />
        <Row label="Conductor" value={salida.conductor} />
        <Row label="Planta" value={salida.planta} />
        <Row
          label={salida.tipo_operacion === 'Ingreso' ? 'Materia Prima' : 'Producto'}
          value={mercancia ?? '—'}
        />
        <Row
          label={salida.tipo_operacion === 'Ingreso' ? 'Proveedor' : 'Cliente'}
          value={contraparte ?? '—'}
        />
        <Row label="Bruto" value={`${numberFormat.format(salida.bruto)} kg`} />
        <Row label="Tara" value={`${numberFormat.format(salida.tara)} kg`} />
        <Row label="Neto" value={`${numberFormat.format(salida.neto)} kg`} highlight />
        <Row
          label="Primer pesaje"
          value={`${salida.fecha_peso_vacio} ${salida.hora_peso_vacio}`}
        />
        <Row
          label="Segundo pesaje"
          value={`${salida.fecha_peso_lleno} ${salida.hora_peso_lleno}`}
        />
        <Row label="Operario" value={`${salida.operario} (${salida.nick_operario})`} />
      </div>

      <p style={mutedStyle}>
        La generación del PDF del tiquete se implementará en un spec posterior.
      </p>

      <button type="button" style={buttonStyle} onClick={() => navigate('/operation')}>
        Volver a operaciones
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={highlight ? highlightValueStyle : valueStyle}>{value}</span>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100dvh',
  gap: '16px',
  padding: '24px',
};

const titleStyle: React.CSSProperties = {
  font: 'var(--text-heading)',
  margin: 0,
};

const mutedStyle: React.CSSProperties = {
  color: 'var(--color-muted)',
  margin: 0,
  textAlign: 'center',
};

const cardStyle: React.CSSProperties = {
  width: 'min(480px, 100%)',
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  font: '400 14px/1.5 var(--font-family)',
};

const labelStyle: React.CSSProperties = {
  color: '#64748b',
};

const valueStyle: React.CSSProperties = {
  color: '#0f172a',
  fontWeight: 500,
  textAlign: 'right',
};

const highlightValueStyle: React.CSSProperties = {
  ...valueStyle,
  color: '#c62828',
  fontWeight: 700,
  fontSize: '16px',
};

const buttonStyle: React.CSSProperties = {
  padding: '12px 24px',
  background: 'var(--color-brand-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  font: '600 15px/1 var(--font-family)',
};
