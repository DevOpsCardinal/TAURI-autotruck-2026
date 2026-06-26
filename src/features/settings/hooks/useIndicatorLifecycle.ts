import { invoke } from '@tauri-apps/api/core';
import { useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchConfiguraciones } from '../api/settings.api';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function connectFromConfig(
  index: 1 | 2,
  modo: string,
  ip: string,
  puerto: string,
  timeout: string,
): Promise<void> {
  if (!isTauri()) return;

  if (modo === 'ip' && ip.trim() !== '') {
    await invoke('indicator_connect', {
      index,
      host: ip.trim(),
      port: Number(puerto) || 9761,
      timeoutMs: Number(timeout) || 5000,
    });
  }
}

export function useIndicatorLifecycle(): void {
  const { accessToken } = useAuth();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!accessToken || !isTauri()) return;

    let cancelled = false;

    async function autoConnect() {
      try {
        const items = await fetchConfiguraciones(accessToken!);
        if (cancelled) return;

        const get = (key: string) => items.find((i) => i.parametro === key)?.valor ?? '';

        const modo1 = get('indicador1_modo');
        const ip1 = get('indicador1_ip');
        const puerto1 = get('indicador1_puerto') || '9761';
        const timeout1 = get('indicador1_timeout') || '5000';

        const modo2 = get('indicador2_modo');
        const ip2 = get('indicador2_ip');
        const puerto2 = get('indicador2_puerto') || '9761';
        const timeout2 = get('indicador2_timeout') || '5000';

        await connectFromConfig(1, modo1, ip1, puerto1, timeout1);
        await connectFromConfig(2, modo2, ip2, puerto2, timeout2);
        connectedRef.current = true;
      } catch {
        // Sin IP o API no disponible: no conectar
      }
    }

    if (!connectedRef.current) {
      void autoConnect();
    }

    return () => {
      cancelled = true;
    };
  }, [accessToken]);
}
