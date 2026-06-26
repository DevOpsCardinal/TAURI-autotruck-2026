import { CheckCircle2, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  onRetry?: () => void;
}

interface ToastContextValue {
  showToast: (
    type: ToastType,
    message: string,
    onRetry?: () => void,
    durationMs?: number,
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_TOAST_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, onRetry?: () => void, durationMs?: number) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((current) => [...current, { id, type, message, onRetry }]);
      window.setTimeout(() => removeToast(id), durationMs ?? DEFAULT_TOAST_DURATION_MS);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.container} aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastMessage({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const Icon = toast.type === 'success' ? CheckCircle2 : XCircle;

  return (
    <div
      className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
      role="status"
    >
      <Icon className={styles.icon} size={18} aria-hidden />
      <div className={styles.body}>
        <span>{toast.message}</span>
        {toast.type === 'error' && toast.onRetry && (
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => {
              toast.onRetry?.();
              onDismiss();
            }}
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
