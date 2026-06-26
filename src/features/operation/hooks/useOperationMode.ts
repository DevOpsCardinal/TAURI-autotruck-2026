import { useCallback, useState } from 'react';
import { OperationMode } from '../types/operation.types';

interface OperationModeResult {
  mode: OperationMode | null;
  setMode: (mode: OperationMode) => void;
  modeVersion: number;
}

export function useOperationMode(): OperationModeResult {
  const [mode, setModeState] = useState<OperationMode | null>(null);
  const [modeVersion, setModeVersion] = useState(0);

  const setMode = useCallback((nextMode: OperationMode) => {
    setModeState((current) => {
      if (current !== nextMode) {
        setModeVersion((v) => v + 1);
      }
      return nextMode;
    });
  }, []);

  return { mode, setMode, modeVersion };
}
