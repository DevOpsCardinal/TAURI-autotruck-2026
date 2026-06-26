import type { EstadoTicket, TicketData } from '../types/ticket.types';

const weightFormatter = new Intl.NumberFormat('es-CO');
const weightFormatterTermico = new Intl.NumberFormat('en-US');

export function formatWeightKg(value: number, locale: 'es-CO' | 'termico' = 'es-CO'): string {
  const formatted = locale === 'termico'
    ? weightFormatterTermico.format(value)
    : weightFormatter.format(value);
  return `${formatted} kg`;
}

export function formatWeightValue(value: number, locale: 'es-CO' | 'termico' = 'es-CO'): string {
  return locale === 'termico'
    ? weightFormatterTermico.format(value)
    : weightFormatter.format(value);
}

export function parseTicketDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const slashMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return new Date(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1]));
  }
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }
  return null;
}

export function formatLongDate(dateStr: string): string {
  const date = parseTicketDate(dateStr);
  if (!date) return dateStr;
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getEmpresaInitials(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function resolveLogoUrl(logoPath: string): string | null {
  const trimmed = logoPath.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed}`;
}

export function isPreliminary(estado: EstadoTicket): boolean {
  return estado === 'PRELIMINAR';
}

export function getEntradaSalidaPesos(data: TicketData): { entrada: number; salida: number } {
  const { bruto_kg, tara_kg } = data.pesaje;
  if (data.tiquete.tipo_operacion === 'Ingreso') {
    return { entrada: bruto_kg, salida: tara_kg };
  }
  return { entrada: tara_kg, salida: bruto_kg };
}

export function getTicketDisplayDate(data: TicketData): string {
  return data.pesaje.fecha_segundo_pesaje
    ?? data.pesaje.fecha_primer_pesaje
    ?? '';
}

export const DEFAULT_FORMAT_KEY = 'autrotruck.ticket.default_format';
