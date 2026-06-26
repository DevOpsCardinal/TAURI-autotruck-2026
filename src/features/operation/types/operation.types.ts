import type { TicketData } from '../../tickets/types/ticket.types';

export type OperationMode = 'ingreso' | 'despacho' | 'transito';

export type { TicketData };

export interface TransitRecord {
  id: number;
  placa: string;
  conductor: string;
  cedula: number;
  caso: 'Ingreso' | 'Despacho';
  estado: 'EN_TRANSITO' | 'CANCELADO';
  estado_display: string;
  planta: string;
  materiaPrima_producto: string;
  cliente_proveedor: string;
  transportadora: string;
  origen_destino: string;
  bruto: number;
  tara: number;
  neto: number;
  tipo_vehiculo: string;
  operario: string;
  nick_operario: string;
  fecha_peso_vacio: string;
  hora_peso_vacio: string;
  no_sello: string | null;
  no_shipment: string | null;
  no_r: string | null;
  no_contenedor: string | null;
  observaciones: string | null;
  created_at: string;
  preliminary_ticket_data?: TicketData;
}

export interface TransitListResponse {
  data: TransitRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}


export interface CreateTransitResponse extends TransitRecord {
  preliminary_ticket_data: TicketData;
}

export interface SalidaResponse {
  tipo_operacion: 'Ingreso' | 'Despacho';
  no_tiquete: number;
  placa: string;
  conductor: string;
  materia_prima?: string;
  proveedor?: string;
  producto?: string;
  cliente?: string;
  planta: string;
  bruto: number;
  tara: number;
  neto: number;
  fecha_peso_vacio: string;
  hora_peso_vacio: string;
  fecha_peso_lleno: string;
  hora_peso_lleno: string;
  operario: string;
  nick_operario: string;
  ticket_data: TicketData;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  errors?: { field: string; message: string }[];
}

export class ApiResponseError extends Error {
  code: string;
  errors?: { field: string; message: string }[];

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiResponseError';
    this.code = body.code;
    this.errors = body.errors;
  }
}

export interface Conductor {
  Nombre: string;
  Cedula: number;
  Fecha_Vencimiento_Licencia: string;
}

export interface Planta {
  Nombre: string;
  Codigo: string;
}

export interface Proveedor {
  NIT: string;
  Nombre: string;
  Telefono: string;
  Direccion: string;
}

export interface Cliente {
  NIT: string;
  Nombre: string;
  Telefono: string;
  Direccion: string;
}

export interface Transportadora {
  NIT: string;
  Nombre: string;
  Telefono: string;
  Direccion: string;
}

export interface Origen {
  Nombre: string;
  Codigo: string;
}

export interface Destino {
  Nombre: string;
  Codigo: string;
}

export interface MateriaPrima {
  Nombre: string;
  Codigo: string;
}

export interface Producto {
  Nombre: string;
  Codigo: string;
}

export interface OperationFormValues {
  placa: string;
  cedulaCiudadania: string;
  conductor: string;
  nitCliente: string;
  planta: string;
  clienteProveedor: string;
  destino: string;
  productoMateria: string;
  transportadora: string;
  no_sello: string;
  no_shipment: string;
  no_r: string;
  no_contenedor: string;
  observaciones: string;
  materiaAutoFromOrigen: boolean;
}

export interface CreateTransitPayload {
  placa: string;
  caso: 'Ingreso' | 'Despacho';
  conductor: string;
  cedula: number;
  planta: string;
  materiaPrima_producto: string;
  cliente_proveedor: string;
  transportadora: string;
  origen_destino: string;
  primer_peso: number;
  tipo_vehiculo?: string | null;
  no_sello?: string | null;
  no_shipment?: string | null;
  no_r?: string | null;
  no_contenedor?: string | null;
  observaciones?: string | null;
}

export interface SalidaPayload {
  segundo_peso: number;
  observaciones?: string | null;
}

export type IngresoSalidaPayload = SalidaPayload;
export type DespachoSalidaPayload = SalidaPayload;

export interface ApiAuth {
  token: string;
}
