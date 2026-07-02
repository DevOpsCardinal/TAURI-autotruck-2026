import { useCallback, useEffect, useMemo, useState } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { getIndicadorTramas } from '../api/catalogs.api';
import { ApiAuth } from '../types/operation.types';
import { parseScaleWeight } from '../utils/parseScaleWeight';

interface ScaleReadingResult {
  peso1: number;
  peso2: number;
  activeScale: 1 | 2;
  setActiveScale: (scale: 1 | 2) => void;
  isConnected: boolean;
  liveWeight: number;
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function useScaleReading(auth: ApiAuth | null): ScaleReadingResult {
  const [peso1, setPeso1] = useState(0);
  const [peso2, setPeso2] = useState(0);
  const [activeScale, setActiveScale] = useState<1 | 2>(1);
  const [trama1, setTrama1] = useState('Cardinal SMA');
  const [trama2, setTrama2] = useState('Cardinal SMA');
  const [isConnected, setIsConnected] = useState(false);
  const [raw1, setRaw1] = useState('');
  const [raw2, setRaw2] = useState('');

  useEffect(() => {
    if (!auth?.token) return;

    let cancelled = false;
    getIndicadorTramas(auth)
      .then((tramas) => {
        if (!cancelled) {
          setTrama1(tramas.trama1);
          setTrama2(tramas.trama2);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTrama1('Cardinal SMA');
          setTrama2('Cardinal SMA');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auth?.token]);

  useEffect(() => {
    if (!isTauri()) {
      setIsConnected(false);
      return;
    }

    const unlisteners: UnlistenFn[] = [];

    async function setupListeners() {
      try {
        const unlisten1 = await listen<string>('scale-weight-1', (event) => {
          setRaw1(event.payload);
          setIsConnected(true);
        });
        const unlisten2 = await listen<string>('scale-weight-2', (event) => {
          setRaw2(event.payload);
          setIsConnected(true);
        });
        unlisteners.push(unlisten1, unlisten2);
      } catch {
        setIsConnected(false);
      }
    }

    setupListeners();

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, []);

  useEffect(() => {
    setPeso1(parseScaleWeight(raw1, trama1));
  }, [raw1, trama1]);

  useEffect(() => {
    setPeso2(parseScaleWeight(raw2, trama2));
  }, [raw2, trama2]);

  const liveWeight = useMemo(
    () => (activeScale === 1 ? peso1 : peso2),
    [activeScale, peso1, peso2],
  );

  const handleSetActiveScale = useCallback((scale: 1 | 2) => {
    setActiveScale(scale);
  }, []);

  return {
    peso1,
    peso2,
    activeScale,
    setActiveScale: handleSetActiveScale,
    isConnected,
    liveWeight,
  };
}
