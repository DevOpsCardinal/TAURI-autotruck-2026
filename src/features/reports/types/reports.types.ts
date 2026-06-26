export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ReportSummary {
  total_bruto: number;
  total_tara: number;
  total_neto: number;
}

export interface IngresoRecord {
  id: number;
  no_tiquete: number;
  placa: string;
  conductor: string | null;
  cedula: number | null;
  materia_prima: string | null;
  planta: string | null;
  proveedor: string | null;
  origen: string | null;
  transportadora: string | null;
  fecha_peso_vacio: string | null;
  hora_peso_vacio: string | null;
  fecha_peso_lleno: string | null;
  hora_peso_lleno: string | null;
  bruto: number;
  tara: number;
  neto: number;
  operario: string | null;
  nick_operario: string | null;
  no_sello: string | null;
  no_shipment: string | null;
  no_r: string | null;
  no_contenedor: string | null;
  observaciones: string | null;
  created_at: string | null;
}

export interface DespachoRecord {
  id: number;
  no_tiquete: number;
  placa: string;
  conductor: string | null;
  cedula: number | null;
  producto: string | null;
  planta: string | null;
  cliente: string | null;
  nit_cliente: string | null;
  destino: string | null;
  transportadora: string | null;
  fecha_peso_vacio: string | null;
  hora_peso_vacio: string | null;
  fecha_peso_lleno: string | null;
  hora_peso_lleno: string | null;
  bruto: number;
  tara: number;
  neto: number;
  operario: string | null;
  nick_operario: string | null;
  no_sello: string | null;
  no_shipment: string | null;
  no_r: string | null;
  no_contenedor: string | null;
  observaciones: string | null;
  created_at: string | null;
}

export interface TransitHistoryRecord {
  id: number;
  no_interno: string | null;
  placa: string;
  conductor: string | null;
  cedula: number | null;
  caso: 'Ingreso' | 'Despacho';
  estado: 'EN_TRANSITO' | 'COMPLETADO' | 'CANCELADO';
  estado_display: string;
  planta: string | null;
  materia_prima_producto: string | null;
  cliente_proveedor: string | null;
  transportadora: string | null;
  origen_destino: string | null;
  bruto: number;
  tara: number;
  neto: number;
  tipo_vehiculo: string | null;
  operario: string | null;
  nick_operario: string | null;
  fecha_peso_vacio: string | null;
  hora_peso_vacio: string | null;
  no_tiquete: number | null;
  no_sello: string | null;
  no_shipment: string | null;
  no_r: string | null;
  no_contenedor: string | null;
  observaciones: string | null;
  motivo_cancelacion: string | null;
  cancelado_en: string | null;
  completado_en: string | null;
  created_at: string | null;
}

export interface IngresosResponse {
  data: IngresoRecord[];
  pagination: ReportPagination;
  summary: ReportSummary;
}

export interface DespachosResponse {
  data: DespachoRecord[];
  pagination: ReportPagination;
  summary: ReportSummary;
}

export interface TransitHistoryResponse {
  data: TransitHistoryRecord[];
  pagination: ReportPagination;
}

export interface UltimoMovimiento {
  tipo: string;
  no_tiquete: number | null;
  placa: string;
  contraparte: string | null;
  neto: number;
  fecha_hora: string;
  estado: string;
}

export interface SummaryResponse {
  fecha: string;
  ingresos_hoy: number;
  despachos_hoy: number;
  neto_entrada_hoy: number;
  neto_salida_hoy: number;
  vehiculos_activos: number;
  ultimos_movimientos: UltimoMovimiento[];
}

export interface IngresoTicketData {
  tipo_operacion: 'Ingreso';
  no_tiquete: number;
  placa: string;
  conductor: string | null;
  cedula: number | null;
  materia_prima: string | null;
  proveedor: string | null;
  origen: string | null;
  planta: string | null;
  transportadora: string | null;
  bruto: number;
  tara: number;
  neto: number;
  fecha_peso_vacio: string | null;
  hora_peso_vacio: string | null;
  fecha_peso_lleno: string | null;
  hora_peso_lleno: string | null;
  operario: string | null;
  nick_operario: string | null;
  no_sello: string | null;
  no_shipment: string | null;
  no_r: string | null;
  no_contenedor: string | null;
  observaciones: string | null;
  created_at: string | null;
}

export interface DespachoTicketData {
  tipo_operacion: 'Despacho';
  no_tiquete: number;
  placa: string;
  conductor: string | null;
  cedula: number | null;
  producto: string | null;
  cliente: string | null;
  nit_cliente: string | null;
  destino: string | null;
  planta: string | null;
  transportadora: string | null;
  bruto: number;
  tara: number;
  neto: number;
  fecha_peso_vacio: string | null;
  hora_peso_vacio: string | null;
  fecha_peso_lleno: string | null;
  hora_peso_lleno: string | null;
  operario: string | null;
  nick_operario: string | null;
  no_sello: string | null;
  no_shipment: string | null;
  no_r: string | null;
  no_contenedor: string | null;
  observaciones: string | null;
  created_at: string | null;
}

export type TicketData = IngresoTicketData | DespachoTicketData;

export type SortOption =
  | 'fecha_desc'
  | 'fecha_asc'
  | 'neto_desc'
  | 'neto_asc'
  | 'tiquete_desc'
  | 'tiquete_asc';

export interface IngresosFilters {
  fecha_desde?: string;
  fecha_hasta?: string;
  planta?: string;
  proveedor?: string;
  materia_prima?: string;
  transportadora?: string;
  placa?: string;
  operario?: string;
  page?: number;
  limit?: number;
  sort?: SortOption;
}

export interface DespachosFilters {
  fecha_desde?: string;
  fecha_hasta?: string;
  planta?: string;
  cliente?: string;
  producto?: string;
  transportadora?: string;
  placa?: string;
  operario?: string;
  page?: number;
  limit?: number;
  sort?: SortOption;
}

export interface TransitFilters {
  fecha_desde?: string;
  fecha_hasta?: string;
  estado?: 'EN_TRANSITO' | 'COMPLETADO' | 'CANCELADO' | '';
  caso?: 'Ingreso' | 'Despacho' | '';
  planta?: string;
  placa?: string;
  page?: number;
  limit?: number;
  sort?: 'fecha_desc' | 'fecha_asc';
}

export type ReportFilterType = 'ingresos' | 'despachos' | 'transit';

export interface FilterOption {
  /** Text shown in the dropdown. */
  label: string;
  /** Identifier sent to the API (NIT, Codigo, or nick). Never changes with catalog renames. */
  value: string;
}

export interface FilterOptions {
  plantas: FilterOption[];
  proveedores: FilterOption[];
  materias: FilterOption[];
  clientes: FilterOption[];
  productos: FilterOption[];
  transportadoras: FilterOption[];
  operarios: FilterOption[];
}

export type IngresosFilterState = Required<Pick<IngresosFilters,
  'fecha_desde' | 'fecha_hasta' | 'planta' | 'proveedor' | 'materia_prima' | 'transportadora' | 'placa' | 'operario'
>> & { page: number; limit: number; sort: SortOption };

export type DespachosFilterState = Required<Pick<DespachosFilters,
  'fecha_desde' | 'fecha_hasta' | 'planta' | 'cliente' | 'producto' | 'transportadora' | 'placa' | 'operario'
>> & { page: number; limit: number; sort: SortOption };

export type TransitFilterState = Required<Pick<TransitFilters,
  'fecha_desde' | 'fecha_hasta' | 'estado' | 'caso' | 'planta' | 'placa'
>> & { page: number; limit: number; sort: 'fecha_desc' | 'fecha_asc' };

export type FilterState = IngresosFilterState | DespachosFilterState | TransitFilterState;

export type DetailRecord = IngresoRecord | DespachoRecord | TransitHistoryRecord;
export type DetailType = 'ingreso' | 'despacho' | 'transit';
