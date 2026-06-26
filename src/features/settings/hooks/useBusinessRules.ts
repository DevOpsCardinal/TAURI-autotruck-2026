import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useBusinessRulesContext } from '../../../context/BusinessRulesContext';
import { useToast } from '../../operation/components/Toast/ToastContext';
import {
  BusinessRule,
  fetchConfiguraciones,
  updateConfiguracion,
} from '../api/settings.api';

const BUSINESS_RULES_CONFIG: Pick<BusinessRule, 'parametro' | 'nombre' | 'descripcion'>[] = [
  {
    parametro: 'regla_peso_minimo_activa',
    nombre: 'Peso mínimo obligatorio en tránsito',
    descripcion:
      'Impide poner un vehículo en tránsito si el indicador de báscula marca cero kilogramos.',
  },
  {
    parametro: 'regla_peso_salida_minimo_activa',
    nombre: 'Peso mínimo obligatorio en salida',
    descripcion:
      'Impide despachar o sacar un vehículo si el peso de báscula o el peso neto es cero kilogramos.',
  },
];

export interface UseBusinessRulesReturn {
  rules: BusinessRule[];
  isLoading: boolean;
  error: string | null;
  toggleRule: (parametro: string) => Promise<void>;
  reload: () => Promise<void>;
}

function buildRulesFromConfig(
  configs: { parametro: string; valor: string }[],
  loadingParametro: string | null,
): BusinessRule[] {
  return BUSINESS_RULES_CONFIG.map((ruleConfig) => {
    const config = configs.find((item) => item.parametro === ruleConfig.parametro);
    return {
      ...ruleConfig,
      activa: config?.valor !== '0',
      cargando: loadingParametro === ruleConfig.parametro,
    };
  });
}

export function useBusinessRules(): UseBusinessRulesReturn {
  const { accessToken } = useAuth();
  const { refreshRules } = useBusinessRulesContext();
  const { showToast } = useToast();
  const [configs, setConfigs] = useState<{ parametro: string; valor: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingParametro, setLoadingParametro] = useState<string | null>(null);
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, boolean>>({});

  const reload = useCallback(async () => {
    if (!accessToken) {
      setConfigs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchConfiguraciones(accessToken);
      setConfigs(data.map((item) => ({ parametro: item.parametro, valor: item.valor })));
    } catch {
      setError('No se pudieron cargar las configuraciones. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    reload();
  }, [reload]);

  const rules = buildRulesFromConfig(configs, loadingParametro).map((rule) => {
    if (loadingParametro === rule.parametro && rule.parametro in optimisticOverrides) {
      return { ...rule, activa: optimisticOverrides[rule.parametro] };
    }
    return rule;
  });

  const toggleRule = useCallback(
    async (parametro: string) => {
      if (!accessToken || loadingParametro) return;

      const config = configs.find((item) => item.parametro === parametro);
      const previousActiva =
        parametro in optimisticOverrides
          ? optimisticOverrides[parametro]
          : config?.valor !== '0';
      const nextActiva = !previousActiva;
      const nextValor = nextActiva ? '1' : '0';

      setLoadingParametro(parametro);
      setOptimisticOverrides((current) => ({ ...current, [parametro]: nextActiva }));

      try {
        await updateConfiguracion(accessToken, parametro, nextValor);
        setConfigs((current) =>
          current.some((item) => item.parametro === parametro)
            ? current.map((item) =>
                item.parametro === parametro ? { ...item, valor: nextValor } : item,
              )
            : [...current, { parametro, valor: nextValor }],
        );
        await refreshRules();
        showToast('success', 'Configuración guardada', undefined, 3000);
      } catch {
        setOptimisticOverrides((current) => ({ ...current, [parametro]: previousActiva }));
        showToast(
          'error',
          'No se pudo guardar la configuración. Intenta de nuevo.',
          undefined,
          5000,
        );
      } finally {
        setLoadingParametro(null);
        setOptimisticOverrides((current) => {
          const next = { ...current };
          delete next[parametro];
          return next;
        });
      }
    },
    [accessToken, configs, loadingParametro, optimisticOverrides, refreshRules, showToast],
  );

  return {
    rules,
    isLoading,
    error,
    toggleRule,
    reload,
  };
}
