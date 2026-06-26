export function formatElapsedTime(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - created.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function getElapsedHours(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return (now.getTime() - created.getTime()) / 3600000;
}

export function highlightMatch(text: string, query: string): { before: string; match: string; after: string } {
  const upperText = text.toUpperCase();
  const upperQuery = query.toUpperCase();
  const index = upperText.indexOf(upperQuery);

  if (index === -1 || !query) {
    return { before: text, match: '', after: '' };
  }

  return {
    before: text.slice(0, index),
    match: text.slice(index, index + query.length),
    after: text.slice(index + query.length),
  };
}

export function mapApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const apiError = error as { code: string; message: string };
    switch (apiError.code) {
      case 'VEHICLE_NOT_IN_TRANSIT':
        return 'Este vehículo ya fue procesado o no está en tránsito.';
      case 'VEHICLE_ALREADY_IN_TRANSIT':
        return 'Ya existe un vehículo activo en tránsito con esa placa.';
      case 'CONCURRENT_MODIFICATION':
        return 'Este vehículo ya fue procesado por otro operario.';
      case 'INVALID_WEIGHT':
      case 'NEGATIVE_NET_WEIGHT':
      case 'ZERO_NET_WEIGHT':
      case 'VALIDATION_ERROR':
        return apiError.message;
      default:
        return apiError.message || 'Ocurrió un error inesperado.';
    }
  }
  return 'Error de red. Verifica tu conexión e intenta nuevamente.';
}
