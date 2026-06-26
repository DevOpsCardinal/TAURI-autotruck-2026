import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { useCallback, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { ApiUnauthorizedError } from '../../operation/api/api.config';
import { ApiResponseError } from '../../operation/types/operation.types';
import type { ApiAuth } from '../../operation/types/operation.types';
import {
  fetchDespachosExport,
  fetchIngresosExport,
  fetchTransitExport,
} from '../api/reports.api';
import type {
  DespachoRecord,
  DespachosFilters,
  IngresoRecord,
  IngresosFilters,
  TransitFilters,
  TransitHistoryRecord,
} from '../types/reports.types';
import { formatTime } from '../utils/reports.utils';

export type ExcelReportType = 'ingresos' | 'despachos' | 'transit';

type ReportFilters = IngresosFilters | DespachosFilters | TransitFilters;

const HEADER_BG = 'D9D9D9';
const FILTER_COLOR = '666666';

const titleStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 14, color: { rgb: '1A1A1A' } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

const filterStyle: XLSX.CellStyle = {
  font: { sz: 10, color: { rgb: FILTER_COLOR } },
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
};

const headerStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 11, color: { rgb: '1A1A1A' } },
  fill: { fgColor: { rgb: HEADER_BG }, patternType: 'solid' },
  border: {
    bottom: { style: 'thin', color: { rgb: '999999' } },
  },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
};

const textStyle: XLSX.CellStyle = {
  alignment: { vertical: 'center' },
};

const numberStyle: XLSX.CellStyle = {
  numFmt: '#,##0',
  alignment: { horizontal: 'right', vertical: 'center' },
};

const integerStyle: XLSX.CellStyle = {
  numFmt: '0',
  alignment: { horizontal: 'center', vertical: 'center' },
};

const totalsLabelStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 11 },
  border: {
    top: { style: 'medium', color: { rgb: '333333' } },
  },
  alignment: { horizontal: 'left', vertical: 'center' },
};

const totalsNumberStyle: XLSX.CellStyle = {
  ...numberStyle,
  font: { bold: true, sz: 11 },
  border: {
    top: { style: 'medium', color: { rgb: '333333' } },
  },
};

interface ColumnDef<T> {
  header: string;
  getValue: (row: T) => string | number | null | undefined;
  style?: XLSX.CellStyle;
}

function cellRef(row: number, col: number): string {
  return XLSX.utils.encode_cell({ r: row, c: col });
}

function setCell(
  ws: XLSX.WorkSheet,
  row: number,
  col: number,
  value: string | number | null | undefined,
  style?: XLSX.CellStyle,
): void {
  const ref = cellRef(row, col);
  if (value === null || value === undefined || value === '') {
    ws[ref] = { v: '', t: 's', s: style ?? textStyle };
    return;
  }
  if (typeof value === 'number') {
    ws[ref] = { v: value, t: 'n', s: style ?? numberStyle };
    return;
  }
  ws[ref] = { v: value, t: 's', s: style ?? textStyle };
}

function autoFitCols(ws: XLSX.WorkSheet, colCount: number): void {
  const widths = new Array<number>(colCount).fill(10);
  for (const ref of Object.keys(ws)) {
    if (ref.startsWith('!')) continue;
    const addr = XLSX.utils.decode_cell(ref);
    if (addr.c < colCount) {
      const len = String(ws[ref].v ?? '').length;
      widths[addr.c] = Math.max(widths[addr.c], Math.min(len + 2, 45));
    }
  }
  ws['!cols'] = widths.map((wch) => ({ wch }));
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildFilename(prefix: string, fechaDesde?: string, fechaHasta?: string): string {
  const today = getTodayDate();
  if (fechaDesde && fechaHasta) {
    return `${prefix}_${fechaDesde}_${fechaHasta}.xlsx`;
  }
  if (fechaDesde) {
    return `${prefix}_${fechaDesde}_${today}.xlsx`;
  }
  if (fechaHasta) {
    return `${prefix}_${today}_${fechaHasta}.xlsx`;
  }
  return `${prefix}_${today}.xlsx`;
}

function buildSubtitle(filters: ReportFilters): string {
  const periodParts: string[] = [];
  if (filters.fecha_desde || filters.fecha_hasta) {
    periodParts.push(`Período: ${filters.fecha_desde ?? '…'} → ${filters.fecha_hasta ?? '…'}`);
  } else {
    periodParts.push('Período: todos los registros');
  }

  const skipKeys = new Set(['page', 'limit', 'sort', 'fecha_desde', 'fecha_hasta']);
  const labels: Record<string, string> = {
    planta: 'Planta',
    proveedor: 'Proveedor',
    materia_prima: 'Materia prima',
    cliente: 'Cliente',
    producto: 'Producto',
    transportadora: 'Transportadora',
    placa: 'Placa',
    operario: 'Operario',
    estado: 'Estado',
    caso: 'Tipo',
  };
  const estadoLabels: Record<string, string> = {
    EN_TRANSITO: 'En Tránsito',
    COMPLETADO: 'Completado',
    CANCELADO: 'Cancelado',
  };

  const active = Object.entries(filters as Record<string, string | number | undefined>)
    .filter(([key, value]) => !skipKeys.has(key) && value !== '' && value !== undefined)
    .map(([key, value]) => {
      const label = labels[key] ?? key;
      const display = key === 'estado' ? (estadoLabels[String(value)] ?? value) : value;
      return `${label}: ${display}`;
    });

  if (active.length === 0) {
    return `${periodParts.join('  |  ')}  |  Sin filtros adicionales`;
  }
  return `${periodParts.join('  |  ')}  |  Filtros: ${active.join(', ')}`;
}

function splitDateTime(value: string | null | undefined): { date: string; time: string } {
  if (!value) return { date: '', time: '' };
  const normalized = value.replace('T', ' ');
  const [datePart, timePart] = normalized.split(' ');
  return {
    date: datePart ?? '',
    time: timePart ? formatTime(timePart) : '',
  };
}

function buildWorksheet<T>(
  title: string,
  sheetName: string,
  filters: ReportFilters,
  columns: ColumnDef<T>[],
  rows: T[],
  weightColumnIndexes: number[],
  includeTotals: boolean,
): XLSX.WorkBook {
  const ws: XLSX.WorkSheet = {};
  const colCount = columns.length;
  const headerRow = 3;
  const dataStartRow = 4;

  setCell(ws, 0, 0, title, titleStyle);
  setCell(ws, 1, 0, buildSubtitle(filters), filterStyle);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
  ];

  columns.forEach((col, index) => {
    setCell(ws, headerRow, index, col.header, headerStyle);
  });

  const totals = { bruto: 0, tara: 0, neto: 0 };

  rows.forEach((row, rowIndex) => {
    const excelRow = dataStartRow + rowIndex;
    columns.forEach((col, colIndex) => {
      const value = col.getValue(row);
      setCell(ws, excelRow, colIndex, value, col.style);
    });

    if (includeTotals && weightColumnIndexes.length === 3) {
      const brutoVal = columns[weightColumnIndexes[0]].getValue(row);
      const taraVal = columns[weightColumnIndexes[1]].getValue(row);
      const netoVal = columns[weightColumnIndexes[2]].getValue(row);
      if (typeof brutoVal === 'number') totals.bruto += brutoVal;
      if (typeof taraVal === 'number') totals.tara += taraVal;
      if (typeof netoVal === 'number') totals.neto += netoVal;
    }
  });

  if (includeTotals && rows.length > 0) {
    const totalsRow = dataStartRow + rows.length + 1;
    setCell(ws, totalsRow, 0, 'TOTALES', totalsLabelStyle);
    for (let c = 1; c < colCount; c += 1) {
      setCell(ws, totalsRow, c, '', totalsLabelStyle);
    }
    setCell(ws, totalsRow, weightColumnIndexes[0], totals.bruto, totalsNumberStyle);
    setCell(ws, totalsRow, weightColumnIndexes[1], totals.tara, totalsNumberStyle);
    setCell(ws, totalsRow, weightColumnIndexes[2], totals.neto, totalsNumberStyle);
  }

  const lastRow = includeTotals && rows.length > 0
    ? dataStartRow + rows.length + 1
    : dataStartRow + Math.max(rows.length - 1, 0);
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow, c: colCount - 1 },
  });

  autoFitCols(ws, colCount);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

function buildIngresosWorkbook(rows: IngresoRecord[], filters: IngresosFilters): XLSX.WorkBook {
  const columns: ColumnDef<IngresoRecord>[] = [
    { header: 'No. Tiquete', getValue: (r) => r.no_tiquete, style: integerStyle },
    { header: 'Fecha', getValue: (r) => r.fecha_peso_lleno ?? '' },
    { header: 'Hora', getValue: (r) => formatTime(r.hora_peso_lleno) },
    { header: 'Placa', getValue: (r) => r.placa?.toUpperCase() ?? '' },
    { header: 'Conductor', getValue: (r) => r.conductor ?? '' },
    { header: 'Cédula', getValue: (r) => r.cedula ?? '', style: integerStyle },
    { header: 'Materia Prima', getValue: (r) => r.materia_prima ?? '' },
    { header: 'Proveedor', getValue: (r) => r.proveedor ?? '' },
    { header: 'Origen', getValue: (r) => r.origen ?? '' },
    { header: 'Planta', getValue: (r) => r.planta ?? '' },
    { header: 'Transportadora', getValue: (r) => r.transportadora ?? '' },
    { header: 'Bruto (kg)', getValue: (r) => r.bruto, style: numberStyle },
    { header: 'Tara (kg)', getValue: (r) => r.tara, style: numberStyle },
    { header: 'Neto (kg)', getValue: (r) => r.neto, style: numberStyle },
    { header: 'Operario', getValue: (r) => r.nick_operario ?? '' },
    { header: 'Fecha Peso Vacío', getValue: (r) => r.fecha_peso_vacio ?? '' },
    { header: 'Hora Peso Vacío', getValue: (r) => formatTime(r.hora_peso_vacio) },
    { header: 'No. Sello', getValue: (r) => r.no_sello ?? '' },
    { header: 'No. Shipment', getValue: (r) => r.no_shipment ?? '' },
    { header: 'No. R', getValue: (r) => r.no_r ?? '' },
    { header: 'No. Contenedor', getValue: (r) => r.no_contenedor ?? '' },
    { header: 'Observaciones', getValue: (r) => r.observaciones ?? '' },
  ];

  return buildWorksheet(
    'REPORTE DE INGRESOS',
    'Ingresos',
    filters,
    columns,
    rows,
    [11, 12, 13],
    true,
  );
}

function buildDespachosWorkbook(rows: DespachoRecord[], filters: DespachosFilters): XLSX.WorkBook {
  const columns: ColumnDef<DespachoRecord>[] = [
    { header: 'No. Tiquete', getValue: (r) => r.no_tiquete, style: integerStyle },
    { header: 'Fecha', getValue: (r) => r.fecha_peso_lleno ?? '' },
    { header: 'Hora', getValue: (r) => formatTime(r.hora_peso_lleno) },
    { header: 'Placa', getValue: (r) => r.placa?.toUpperCase() ?? '' },
    { header: 'Conductor', getValue: (r) => r.conductor ?? '' },
    { header: 'Cédula', getValue: (r) => r.cedula ?? '', style: integerStyle },
    { header: 'Producto', getValue: (r) => r.producto ?? '' },
    { header: 'Cliente', getValue: (r) => r.cliente ?? '' },
    { header: 'NIT Cliente', getValue: (r) => r.nit_cliente ?? '' },
    { header: 'Destino', getValue: (r) => r.destino ?? '' },
    { header: 'Planta', getValue: (r) => r.planta ?? '' },
    { header: 'Transportadora', getValue: (r) => r.transportadora ?? '' },
    { header: 'Bruto (kg)', getValue: (r) => r.bruto, style: numberStyle },
    { header: 'Tara (kg)', getValue: (r) => r.tara, style: numberStyle },
    { header: 'Neto (kg)', getValue: (r) => r.neto, style: numberStyle },
    { header: 'Operario', getValue: (r) => r.nick_operario ?? '' },
    { header: 'Fecha Peso Vacío', getValue: (r) => r.fecha_peso_vacio ?? '' },
    { header: 'Hora Peso Vacío', getValue: (r) => formatTime(r.hora_peso_vacio) },
    { header: 'No. Sello', getValue: (r) => r.no_sello ?? '' },
    { header: 'No. Shipment', getValue: (r) => r.no_shipment ?? '' },
    { header: 'No. R', getValue: (r) => r.no_r ?? '' },
    { header: 'No. Contenedor', getValue: (r) => r.no_contenedor ?? '' },
    { header: 'Observaciones', getValue: (r) => r.observaciones ?? '' },
  ];

  return buildWorksheet(
    'REPORTE DE DESPACHOS',
    'Despachos',
    filters,
    columns,
    rows,
    [12, 13, 14],
    true,
  );
}

function buildTransitWorkbook(rows: TransitHistoryRecord[], filters: TransitFilters): XLSX.WorkBook {
  const columns: ColumnDef<TransitHistoryRecord>[] = [
    { header: 'No. Interno', getValue: (r) => r.no_interno ?? '' },
    {
      header: 'Fecha',
      getValue: (r) => splitDateTime(r.created_at).date,
    },
    {
      header: 'Hora',
      getValue: (r) => splitDateTime(r.created_at).time,
    },
    { header: 'Placa', getValue: (r) => r.placa?.toUpperCase() ?? '' },
    { header: 'Conductor', getValue: (r) => r.conductor ?? '' },
    { header: 'Cédula', getValue: (r) => r.cedula ?? '', style: integerStyle },
    { header: 'Tipo', getValue: (r) => r.caso ?? '' },
    { header: 'Estado', getValue: (r) => r.estado_display ?? '' },
    { header: 'Mercancía', getValue: (r) => r.materia_prima_producto ?? '' },
    { header: 'Contraparte', getValue: (r) => r.cliente_proveedor ?? '' },
    { header: 'Planta', getValue: (r) => r.planta ?? '' },
    { header: 'Transportadora', getValue: (r) => r.transportadora ?? '' },
    { header: 'Origen / Destino', getValue: (r) => r.origen_destino ?? '' },
    { header: 'Tipo Vehículo', getValue: (r) => r.tipo_vehiculo ?? '' },
    { header: 'Bruto (kg)', getValue: (r) => r.bruto, style: numberStyle },
    { header: 'Tara (kg)', getValue: (r) => r.tara, style: numberStyle },
    { header: 'Neto (kg)', getValue: (r) => r.neto, style: numberStyle },
    { header: 'Operario', getValue: (r) => r.nick_operario ?? '' },
    { header: 'Completado En', getValue: (r) => r.completado_en ?? '' },
    { header: 'Cancelado En', getValue: (r) => r.cancelado_en ?? '' },
    { header: 'Motivo Cancelación', getValue: (r) => r.motivo_cancelacion ?? '' },
    { header: 'No. Sello', getValue: (r) => r.no_sello ?? '' },
    { header: 'No. Shipment', getValue: (r) => r.no_shipment ?? '' },
    { header: 'No. R', getValue: (r) => r.no_r ?? '' },
    { header: 'No. Contenedor', getValue: (r) => r.no_contenedor ?? '' },
    { header: 'Observaciones', getValue: (r) => r.observaciones ?? '' },
  ];

  return buildWorksheet(
    'HISTORIAL DE TRÁNSITO',
    'Tránsito',
    filters,
    columns,
    rows,
    [],
    false,
  );
}

async function saveWorkbook(wb: XLSX.WorkBook, defaultPath: string): Promise<boolean> {
  const filePath = await save({
    defaultPath,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });

  if (!filePath) return false;

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  await writeFile(filePath, new Uint8Array(buffer));
  return true;
}

export interface UseExcelExportResult {
  download: () => Promise<void>;
  isLoading: boolean;
}

export function useExcelExport(
  reportType: ExcelReportType,
  filters: ReportFilters,
  auth: ApiAuth | null,
  onUnauthorized: () => void,
  onToast: (type: 'success' | 'error', message: string) => void,
): UseExcelExportResult {
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);

  const download = useCallback(async () => {
    if (!auth || isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      let wb: XLSX.WorkBook;
      let defaultPath: string;

      if (reportType === 'ingresos') {
        const ingresosFilters = filters as IngresosFilters;
        const rows = await fetchIngresosExport(auth, ingresosFilters);
        if (rows.length === 0) {
          onToast('error', 'No hay registros para exportar con los filtros actuales.');
          return;
        }
        wb = buildIngresosWorkbook(rows, ingresosFilters);
        defaultPath = buildFilename('Ingresos', ingresosFilters.fecha_desde, ingresosFilters.fecha_hasta);
      } else if (reportType === 'despachos') {
        const despachosFilters = filters as DespachosFilters;
        const rows = await fetchDespachosExport(auth, despachosFilters);
        if (rows.length === 0) {
          onToast('error', 'No hay registros para exportar con los filtros actuales.');
          return;
        }
        wb = buildDespachosWorkbook(rows, despachosFilters);
        defaultPath = buildFilename('Despachos', despachosFilters.fecha_desde, despachosFilters.fecha_hasta);
      } else {
        const transitFilters = filters as TransitFilters;
        const rows = await fetchTransitExport(auth, transitFilters);
        if (rows.length === 0) {
          onToast('error', 'No hay registros para exportar con los filtros actuales.');
          return;
        }
        wb = buildTransitWorkbook(rows, transitFilters);
        defaultPath = buildFilename('Transito', transitFilters.fecha_desde, transitFilters.fecha_hasta);
      }

      const saved = await saveWorkbook(wb, defaultPath);
      if (saved) {
        onToast('success', 'Archivo Excel guardado correctamente.');
      }
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        onUnauthorized();
        return;
      }
      if (err instanceof ApiResponseError) {
        onToast('error', err.message || 'No se pudo exportar el reporte.');
        return;
      }
      onToast('error', 'No se pudo generar el archivo Excel.');
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [auth, filters, onToast, onUnauthorized, reportType]);

  return { download, isLoading };
}
