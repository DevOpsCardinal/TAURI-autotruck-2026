import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export type IndicatorStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface IndicatorStatusPayload {
  status: IndicatorStatus;
  host?: string;
  port?: number;
  message?: string;
}

export interface IndicatorStatusContextValue {
  status1: IndicatorStatus;
  statusPayload1: IndicatorStatusPayload | null;
  status2: IndicatorStatus;
  statusPayload2: IndicatorStatusPayload | null;
}

const IndicatorStatusContext = createContext<IndicatorStatusContextValue>({
  status1: 'disconnected',
  statusPayload1: null,
  status2: 'disconnected',
  statusPayload2: null,
});

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function IndicatorStatusProvider({ children }: { children: ReactNode }) {
  const [status1, setStatus1] = useState<IndicatorStatus>('disconnected');
  const [statusPayload1, setStatusPayload1] = useState<IndicatorStatusPayload | null>(null);
  const [status2, setStatus2] = useState<IndicatorStatus>('disconnected');
  const [statusPayload2, setStatusPayload2] = useState<IndicatorStatusPayload | null>(null);

  useEffect(() => {
    if (!isTauri()) return;

    const unlisteners: UnlistenFn[] = [];

    async function setup() {
      // Eventos de cambio de estado del indicador (conexión / desconexión / error)
      const unlisten1 = await listen<IndicatorStatusPayload>('indicator-1-status', (event) => {
        setStatus1(event.payload.status);
        setStatusPayload1(event.payload);
      });
      const unlisten2 = await listen<IndicatorStatusPayload>('indicator-2-status', (event) => {
        setStatus2(event.payload.status);
        setStatusPayload2(event.payload);
      });

      // Si llegan datos de peso, el indicador está conectado aunque el evento
      // de conexión ya haya ocurrido antes de que este proveedor lo escuchara.
      const unlistenW1 = await listen<string>('scale-weight-1', () => {
        setStatus1((prev) => (prev === 'connected' ? prev : 'connected'));
      });
      const unlistenW2 = await listen<string>('scale-weight-2', () => {
        setStatus2((prev) => (prev === 'connected' ? prev : 'connected'));
      });

      unlisteners.push(unlisten1, unlisten2, unlistenW1, unlistenW2);
    }

    void setup();

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, []);

  return (
    <IndicatorStatusContext.Provider value={{ status1, statusPayload1, status2, statusPayload2 }}>
      {children}
    </IndicatorStatusContext.Provider>
  );
}

export function useIndicatorStatusContext(): IndicatorStatusContextValue {
  return useContext(IndicatorStatusContext);
}
