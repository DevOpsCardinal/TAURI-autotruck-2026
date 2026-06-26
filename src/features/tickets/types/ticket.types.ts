export type TipoOperacion = 'Ingreso' | 'Despacho';
export type EstadoTicket = 'PRELIMINAR' | 'FINAL' | 'REIMPRESION';
export type FormatoImpresion = 'termico' | 'corporativo' | 'media-hoja';

export interface TicketEmpresa {
  nombre: string;
  nit: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  logo_path: string;
  correo?: string;
}

export interface TicketTiquete {
  numero: number;
  codigo_visual: string;
  tipo_operacion: TipoOperacion;
  estado: EstadoTicket;
}

export interface TicketVehiculo {
  placa: string;
  tipo: string;
  transportadora: string;
}

export interface TicketConductor {
  nombre: string;
  cedula: string;
}

export interface TicketMercancia {
  descripcion: string;
  contraparte_label: string;
  contraparte: string;
  contraparte_nit: string;
  planta: string;
  origen_destino_label: string;
  origen_destino: string;
}

export interface TicketPesaje {
  bruto_kg: number;
  tara_kg: number;
  neto_kg: number;
  fecha_primer_pesaje: string;
  hora_primer_pesaje: string;
  fecha_segundo_pesaje: string | null;
  hora_segundo_pesaje: string | null;
}

export interface TicketReferencias {
  no_sello: string | null;
  no_shipment: string | null;
  no_r: string | null;
  no_contenedor: string | null;
}

export interface TicketOperario {
  nombre: string;
  nick: string;
}

export interface TicketData {
  empresa: TicketEmpresa;
  tiquete: TicketTiquete;
  vehiculo: TicketVehiculo;
  conductor: TicketConductor;
  mercancia: TicketMercancia;
  pesaje: TicketPesaje;
  referencias: TicketReferencias;
  observaciones: string;
  operario: TicketOperario;
  bascula: string;
  generado_en: string;
}
