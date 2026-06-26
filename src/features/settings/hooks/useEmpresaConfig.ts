import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../operation/components/Toast/ToastContext';
import { fetchConfiguraciones, updateConfiguracion } from '../api/settings.api';

export interface EmpresaForm {
  empresa_nombre: string;
  empresa_nit: string;
  empresa_direccion: string;
  empresa_ciudad: string;
  empresa_telefono: string;
  empresa_correo: string;
  empresa_logo_path: string;
}

const EMPTY_FORM: EmpresaForm = {
  empresa_nombre: '',
  empresa_nit: '',
  empresa_direccion: '',
  empresa_ciudad: '',
  empresa_telefono: '',
  empresa_correo: '',
  empresa_logo_path: '',
};

const EMPRESA_KEYS = Object.keys(EMPTY_FORM) as (keyof EmpresaForm)[];

export interface UseEmpresaConfigReturn {
  form: EmpresaForm;
  savedForm: EmpresaForm;
  isLoading: boolean;
  isSaving: boolean;
  isPickingLogo: boolean;
  error: string | null;
  isDirty: boolean;
  setField: (key: keyof EmpresaForm, value: string) => void;
  pickLogo: () => Promise<void>;
  save: () => Promise<void>;
  reload: () => Promise<void>;
}

function bytesToDataUrl(bytes: Uint8Array, ext: string): string {
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };
  const mime = mimeMap[ext.toLowerCase()] ?? 'image/png';
  const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join('');
  return `data:${mime};base64,${btoa(binary)}`;
}

export function useEmpresaConfig(): UseEmpresaConfigReturn {
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState<EmpresaForm>(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState<EmpresaForm>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingLogo, setIsPickingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchConfiguraciones(accessToken);
      const next = { ...EMPTY_FORM };
      for (const item of items) {
        if (EMPRESA_KEYS.includes(item.parametro as keyof EmpresaForm)) {
          (next as Record<string, string>)[item.parametro] = item.valor;
        }
      }
      setForm(next);
      setSavedForm(next);
    } catch {
      setError('No se pudieron cargar los datos de la empresa.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setField = useCallback((key: keyof EmpresaForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const pickLogo = useCallback(async () => {
    setIsPickingLogo(true);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Imagen', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }],
      });
      if (!selected || typeof selected !== 'string') return;

      const ext = selected.split('.').pop() ?? 'png';
      const bytes = await readFile(selected);
      const dataUrl = bytesToDataUrl(bytes, ext);
      setForm((prev) => ({ ...prev, empresa_logo_path: dataUrl }));
    } catch {
      showToast('error', 'No se pudo cargar la imagen.', undefined, 4000);
    } finally {
      setIsPickingLogo(false);
    }
  }, [showToast]);

  const save = useCallback(async () => {
    if (!accessToken || isSaving) return;
    setIsSaving(true);
    try {
      const changedKeys = EMPRESA_KEYS.filter((key) => form[key] !== savedForm[key]);
      await Promise.all(
        changedKeys.map((key) => updateConfiguracion(accessToken, key, form[key])),
      );
      setSavedForm(form);
      showToast('success', 'Información de la empresa guardada.', undefined, 3000);
    } catch {
      showToast('error', 'No se pudo guardar. Intenta de nuevo.', undefined, 5000);
    } finally {
      setIsSaving(false);
    }
  }, [accessToken, form, isSaving, savedForm, showToast]);

  const isDirty = EMPRESA_KEYS.some((key) => form[key] !== savedForm[key]);

  return {
    form,
    savedForm,
    isLoading,
    isSaving,
    isPickingLogo,
    error,
    isDirty,
    setField,
    pickLogo,
    save,
    reload,
  };
}
