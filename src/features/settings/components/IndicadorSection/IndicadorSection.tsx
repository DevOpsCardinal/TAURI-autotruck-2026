import { Loader2, Network, X } from 'lucide-react';
import type { FormErrors, IndicadorForm, TestResult } from '../../hooks/useIndicadorConfig';
import { TRAMA_OPTIONS, useIndicadorConfig } from '../../hooks/useIndicadorConfig';
import type { IndicatorStatus } from '../../hooks/useIndicatorStatus';
import { useIndicatorStatus } from '../../hooks/useIndicatorStatus';
import styles from './IndicadorSection.module.css';

const STATUS_LABELS: Record<IndicatorStatus, string> = {
  connected: 'Conectado',
  connecting: 'Conectando...',
  disconnected: 'Desconectado',
  error: 'Error de conexión',
};

function IndicadorSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden>
      <div className={styles.skeletonWide} />
      <div className={styles.skeletonRow}>
        <div className={styles.skeletonMedium} />
        <div className={styles.skeletonMedium} />
      </div>
      <div className={styles.skeletonWide} />
    </div>
  );
}

const STATUS_BADGE_CLASS: Record<IndicatorStatus, string> = {
  connected: 'statusBadge--connected',
  connecting: 'statusBadge--connecting',
  disconnected: 'statusBadge--disconnected',
  error: 'statusBadge--error',
};

function StatusBadge({ status }: { status: IndicatorStatus }) {
  return (
    <span className={`${styles.statusBadge} ${styles[STATUS_BADGE_CLASS[status]]}`}>
      <span className={styles.statusDot} />
      <span className={styles.statusText}>{STATUS_LABELS[status]}</span>
    </span>
  );
}

interface IndicadorCardProps {
  title: string;
  form: IndicadorForm;
  errors: FormErrors;
  status: IndicatorStatus;
  isTesting: boolean;
  isSaving: boolean;
  isDirty: boolean;
  testResult: TestResult | null;
  onFieldChange: (key: keyof IndicadorForm, value: string) => void;
  onTest: () => void;
  onSave: () => void;
  onDismissError: () => void;
}

function IndicadorCard({
  title,
  form,
  errors,
  status,
  isTesting,
  isSaving,
  isDirty,
  testResult,
  onFieldChange,
  onTest,
  onSave,
  onDismissError,
}: IndicadorCardProps) {
  const canTest = form.ip.trim() !== '' && !errors.puerto && !errors.ip;
  const canSave = isDirty && !errors.ip && !errors.puerto && !errors.timeout;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          <Network size={18} aria-hidden />
          <span>{title}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className={styles.fields}>
        <div className={styles.fieldRow}>
          <label className={styles.fieldLabel} htmlFor={`${title}-ip`}>
            Dirección IP
          </label>
          <input
            id={`${title}-ip`}
            type="text"
            className={styles.fieldInput}
            placeholder="192.168.1.100"
            value={form.ip}
            maxLength={15}
            onChange={(e) => onFieldChange('ip', e.target.value)}
            disabled={isSaving}
          />
          {errors.ip && <span className={styles.fieldError}>{errors.ip}</span>}
        </div>

        <div className={styles.fieldRowInline}>
          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel} htmlFor={`${title}-puerto`}>
              Puerto TCP
            </label>
            <input
              id={`${title}-puerto`}
              type="number"
              className={styles.fieldInput}
              placeholder="9761"
              value={form.puerto}
              min={1}
              max={65535}
              onChange={(e) => onFieldChange('puerto', e.target.value)}
              disabled={isSaving}
            />
            {errors.puerto && <span className={styles.fieldError}>{errors.puerto}</span>}
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.fieldLabel} htmlFor={`${title}-timeout`}>
              Timeout (ms)
            </label>
            <input
              id={`${title}-timeout`}
              type="number"
              className={styles.fieldInput}
              placeholder="5000"
              value={form.timeout}
              min={500}
              max={30000}
              onChange={(e) => onFieldChange('timeout', e.target.value)}
              disabled={isSaving}
            />
            {errors.timeout && <span className={styles.fieldError}>{errors.timeout}</span>}
          </div>
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.fieldLabel} htmlFor={`${title}-trama`}>
            Trama de comunicación
          </label>
          <select
            id={`${title}-trama`}
            className={styles.fieldSelect}
            value={form.trama}
            onChange={(e) => onFieldChange('trama', e.target.value)}
            disabled={isSaving}
          >
            {TRAMA_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.testBtn}
            onClick={() => void onTest()}
            disabled={!canTest || isTesting || isSaving}
          >
            {isTesting ? (
              <>
                <Loader2 size={14} className={styles.spin} aria-hidden />
                Probando...
              </>
            ) : (
              'Probar conexión'
            )}
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => void onSave()}
            disabled={!canSave || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className={styles.spin} aria-hidden />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </button>
        </div>

        {testResult && (
          <div
            className={`${styles.testResult} ${testResult.success ? styles.testResultSuccess : styles.testResultError}`}
            role="status"
          >
            <span>
              {testResult.success ? '✓' : '✕'} {testResult.message}
            </span>
            {!testResult.success && (
              <button
                type="button"
                className={styles.testResultClose}
                onClick={onDismissError}
                aria-label="Cerrar mensaje"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function IndicadorSection() {
  const {
    form1,
    form2,
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
  } = useIndicadorConfig();

  const { status1, status2 } = useIndicatorStatus();

  return (
    <section className={styles.section} aria-labelledby="indicador-section-title">
      <h2 id="indicador-section-title" className={styles.title}>
        Conexión al indicador de peso
      </h2>
      <div className={styles.separator} />

      {isLoading && <IndicadorSkeleton />}

      {!isLoading && error && (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
          <button type="button" className={styles.retryButton} onClick={() => void reload()}>
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className={styles.body}>
          <IndicadorCard
            title="Indicador 1"
            form={form1}
            errors={errors1}
            status={status1}
            isTesting={isTesting1}
            isSaving={isSaving}
            isDirty={isDirty1}
            testResult={testResult1}
            onFieldChange={setField1}
            onTest={testConnection1}
            onSave={save}
            onDismissError={dismissTestResult1}
          />
          <IndicadorCard
            title="Indicador 2"
            form={form2}
            errors={errors2}
            status={status2}
            isTesting={isTesting2}
            isSaving={isSaving}
            isDirty={isDirty2}
            testResult={testResult2}
            onFieldChange={setField2}
            onTest={testConnection2}
            onSave={save}
            onDismissError={dismissTestResult2}
          />
        </div>
      )}
    </section>
  );
}
