import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchConfiguraciones } from '../features/settings/api/settings.api';
import { useAuth } from './AuthContext';

export interface BusinessRulesContextValue {
  regla_peso_minimo_activa: boolean;
  regla_peso_salida_minimo_activa: boolean;
  refreshRules: () => Promise<void>;
}

const BusinessRulesContext = createContext<BusinessRulesContextValue | null>(null);

export function BusinessRulesProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  const [regla_peso_minimo_activa, setReglaPesoMinimoActiva] = useState(true);
  const [regla_peso_salida_minimo_activa, setReglaPesoSalidaMinimoActiva] = useState(true);

  const refreshRules = useCallback(async () => {
    if (!accessToken) {
      setReglaPesoMinimoActiva(true);
      setReglaPesoSalidaMinimoActiva(true);
      return;
    }

    try {
      const data = await fetchConfiguraciones(accessToken);
      const pesoMinimo = data.find((item) => item.parametro === 'regla_peso_minimo_activa');
      const pesoSalidaMinimo = data.find(
        (item) => item.parametro === 'regla_peso_salida_minimo_activa',
      );
      setReglaPesoMinimoActiva(pesoMinimo?.valor !== '0');
      setReglaPesoSalidaMinimoActiva(pesoSalidaMinimo?.valor !== '0');
    } catch {
      // Mantener el valor actual si la recarga falla.
    }
  }, [accessToken]);

  useEffect(() => {
    void refreshRules();
  }, [refreshRules]);

  const value = useMemo(
    () => ({ regla_peso_minimo_activa, regla_peso_salida_minimo_activa, refreshRules }),
    [regla_peso_minimo_activa, regla_peso_salida_minimo_activa, refreshRules],
  );

  return (
    <BusinessRulesContext.Provider value={value}>
      {children}
    </BusinessRulesContext.Provider>
  );
}

export function useBusinessRulesContext(): BusinessRulesContextValue {
  const ctx = useContext(BusinessRulesContext);
  if (!ctx) {
    throw new Error('useBusinessRulesContext must be used within BusinessRulesProvider');
  }
  return ctx;
}
