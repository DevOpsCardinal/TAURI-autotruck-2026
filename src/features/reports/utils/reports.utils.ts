export const numberFormat = new Intl.NumberFormat('es-CO');

export function formatWeight(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return numberFormat.format(value);
}

export function formatTime(hhmmss: string | null | undefined): string {
  if (!hhmmss) return '—';
  return hhmmss.slice(0, 5);
}

export function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function truncateText(value: string | null | undefined, max: number): string {
  if (!value) return '—';
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

export function hasActiveFilters(
  filters: Record<string, string | number>,
  excludeKeys: string[] = ['page', 'limit', 'sort'],
): boolean {
  return Object.entries(filters).some(([key, value]) => {
    if (excludeKeys.includes(key)) return false;
    return value !== '' && value !== undefined;
  });
}
