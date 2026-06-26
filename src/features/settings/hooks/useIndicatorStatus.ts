// Re-exporta tipos e implementación desde el contexto global.
// El estado se comparte entre todas las páginas sin perder el último evento.
export type {
  IndicatorStatus,
  IndicatorStatusPayload,
  IndicatorStatusContextValue as UseIndicatorStatusReturn,
} from '../../../context/IndicatorStatusContext';

export { useIndicatorStatusContext as useIndicatorStatus } from '../../../context/IndicatorStatusContext';
