import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../operation/components/Toast/ToastContext';
import {
  fetchConfiguraciones,
  testIndicadorConnection,
  updateConfiguracion,
} from '../api/settings.api';

export interface IndicadorForm {
  ip: string;
  puerto: string;
  timeout: string;
  trama: string;
}

export interface TestResult {
  success: boolean;
  message: string;
}

export interface FormErrors {
  ip?: string;
  puerto?: string;
  timeout?: string;
}

export interface UseIndicadorConfigReturn {
  form1: IndicadorForm;
  form2: IndicadorForm;
  savedForm1: IndicadorForm;
  savedForm2: IndicadorForm;
  isLoading: boolean;
  isSaving: boolean;
  isTesting1: boolean;
  isTesting2: boolean;
  testResult1: TestResult | null;
  testResult2: TestResult | null;
  isDirty1: boolean;
  isDirty2: boolean;
  errors1: FormErrors;
  errors2: FormErrors;
  setField1: (key: keyof IndicadorForm, value: string) => void;
  setField2: (key: keyof IndicadorForm, value: string) => void;
  save: () => Promise<void>;
  testConnection1: () => Promise<void>;
  testConnection2: () => Promise<void>;
  dismissTestResult1: () => void;
  dismissTestResult2: () => void;
  reload: () => Promise<void>;
  error: string | null;
}

const EMPTY_FORM: IndicadorForm = {
  ip: '',
  puerto: '9761',
  timeout: '5000',
  trama: 'Cardinal SMA',
};

const FORM_KEYS: (keyof IndicadorForm)[] = ['ip', 'puerto', 'timeout', 'trama'];

const TRAMA_OPTIONS = [
  'Cardinal SMA',
  'Rice Lake IQ355',
  'Cardinal SB-200',
  'AND',
  'Cardinal SB-400',
  'WI110',
  'Toledo Long/Short',
  'SB500 con Semáforo',
  'Numero',
  'Bavaria Tibitoc',
] as const;

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function mapConfigToForm(items: { parametro: string; valor: string }[], prefix: string): IndicadorForm {
  const get = (key: string) => items.find((i) => i.parametro === key)?.valor ?? '';
  return {
    ip: get(`${prefix}_ip`),
    puerto: get(`${prefix}_puerto`) || '9761',
    timeout: get(`${prefix}_timeout`) || '5000',
    trama: get(`${prefix}_trama`) || 'Cardinal SMA',
  };
}

function isValidIpv4(ip: string): boolean {
  if (ip === '') return true;
  const match = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  return match.slice(1).every((octet) => {
    const n = Number(octet);
    return n >= 0 && n <= 255;
  });
}

function validateForm(form: IndicadorForm): FormErrors {
  const errors: FormErrors = {};

  if (!isValidIpv4(form.ip)) {
    errors.ip = 'Dirección IP inválida';
  }

  const puerto = Number(form.puerto);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    errors.puerto = 'El puerto debe estar entre 1 y 65535.';
  }

  const timeout = Number(form.timeout);
  if (!Number.isInteger(timeout) || timeout < 500 || timeout > 30000) {
    errors.timeout = 'El timeout debe estar entre 500 y 30000 ms.';
  }

  return errors;
}

function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

async function connectIndicator(index: 1 | 2, form: IndicadorForm): Promise<void> {
  if (!isTauri()) return;

  if (form.ip.trim() === '') {
    await invoke('indicator_disconnect', { index });
    return;
  }

  await invoke('indicator_connect', {
    index,
    host: form.ip.trim(),
    port: Number(form.puerto),
    timeoutMs: Number(form.timeout),
  });
}

export { TRAMA_OPTIONS };

export function useIndicadorConfig(): UseIndicadorConfigReturn {
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [form1, setForm1] = useState<IndicadorForm>(EMPTY_FORM);
  const [form2, setForm2] = useState<IndicadorForm>(EMPTY_FORM);
  const [savedForm1, setSavedForm1] = useState<IndicadorForm>(EMPTY_FORM);
  const [savedForm2, setSavedForm2] = useState<IndicadorForm>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting1, setIsTesting1] = useState(false);
  const [isTesting2, setIsTesting2] = useState(false);
  const [testResult1, setTestResult1] = useState<TestResult | null>(null);
  const [testResult2, setTestResult2] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testTimer1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const testTimer2 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const errors1 = useMemo(() => validateForm(form1), [form1]);
  const errors2 = useMemo(() => validateForm(form2), [form2]);

  const isDirty1 = FORM_KEYS.some((key) => form1[key] !== savedForm1[key]);
  const isDirty2 = FORM_KEYS.some((key) => form2[key] !== savedForm2[key]);

  const reload = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchConfiguraciones(accessToken);
      const next1 = mapConfigToForm(items, 'indicador1');
      const next2 = mapConfigToForm(items, 'indicador2');
      setForm1(next1);
      setForm2(next2);
      setSavedForm1(next1);
      setSavedForm2(next2);
    } catch {
      setError('No se pudo cargar la configuración del indicador.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return () => {
      if (testTimer1.current) clearTimeout(testTimer1.current);
      if (testTimer2.current) clearTimeout(testTimer2.current);
    };
  }, []);

  const setField1 = useCallback((key: keyof IndicadorForm, value: string) => {
    setForm1((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setField2 = useCallback((key: keyof IndicadorForm, value: string) => {
    setForm2((prev) => ({ ...prev, [key]: value }));
  }, []);

  const runTest = useCallback(
    async (form: IndicadorForm, setTesting: (v: boolean) => void, setResult: (r: TestResult | null) => void, timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
      if (!accessToken || form.ip.trim() === '') return;
      const formErrors = validateForm(form);
      if (hasErrors(formErrors)) return;

      setTesting(true);
      setResult(null);
      try {
        const result = await testIndicadorConnection(accessToken, {
          host: form.ip.trim(),
          port: Number(form.puerto),
          timeout: Number(form.timeout),
        });
        setResult(result);
        if (result.success) {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setResult(null), 5000);
        }
      } catch {
        setResult({ success: false, message: 'No se pudo probar la conexión.' });
      } finally {
        setTesting(false);
      }
    },
    [accessToken],
  );

  const testConnection1 = useCallback(async () => {
    await runTest(form1, setIsTesting1, setTestResult1, testTimer1);
  }, [form1, runTest]);

  const testConnection2 = useCallback(async () => {
    await runTest(form2, setIsTesting2, setTestResult2, testTimer2);
  }, [form2, runTest]);

  const dismissTestResult1 = useCallback(() => setTestResult1(null), []);
  const dismissTestResult2 = useCallback(() => setTestResult2(null), []);

  const save = useCallback(async () => {
    if (!accessToken || isSaving) return;

    const e1 = validateForm(form1);
    const e2 = validateForm(form2);
    if (hasErrors(e1) || hasErrors(e2)) {
      showToast('error', 'Corrige los errores del formulario antes de guardar.', undefined, 4000);
      return;
    }

    setIsSaving(true);
    try {
      const updates: Promise<unknown>[] = [];

      const indicador1Keys = ['ip', 'puerto', 'timeout', 'trama'] as const;
      for (const key of indicador1Keys) {
        if (form1[key] !== savedForm1[key]) {
          updates.push(updateConfiguracion(accessToken, `indicador1_${key}`, form1[key]));
        }
      }

      const indicador2Keys = ['ip', 'puerto', 'timeout', 'trama'] as const;
      for (const key of indicador2Keys) {
        if (form2[key] !== savedForm2[key]) {
          updates.push(updateConfiguracion(accessToken, `indicador2_${key}`, form2[key]));
        }
      }

      await Promise.all(updates);

      setSavedForm1(form1);
      setSavedForm2(form2);

      await connectIndicator(1, form1);
      await connectIndicator(2, form2);

      showToast('success', 'Configuración guardada. Reconectando...', undefined, 3000);
    } catch {
      showToast('error', 'No se pudo guardar. Intenta de nuevo.', undefined, 5000);
    } finally {
      setIsSaving(false);
    }
  }, [accessToken, form1, form2, isSaving, savedForm1, savedForm2, showToast]);

  return {
    form1,
    form2,
    savedForm1,
    savedForm2,
    isLoading,
    isSaving,
    isTesting1,
    isTesting2,
    testResult1,
    testResult2,
    isDirty1,
    isDirty2,
    errors1,
    errors2,
    setField1,
    setField2,
    save,
    testConnection1,
    testConnection2,
    dismissTestResult1,
    dismissTestResult2,
    reload,
    error,
  };
}
