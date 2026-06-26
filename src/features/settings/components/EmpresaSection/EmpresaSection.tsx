import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import type { EmpresaForm } from '../../hooks/useEmpresaConfig';
import { useEmpresaConfig } from '../../hooks/useEmpresaConfig';
import styles from './EmpresaSection.module.css';

const FIELDS: { key: keyof EmpresaForm; label: string; type?: string; placeholder?: string }[] = [
  { key: 'empresa_nombre', label: 'Nombre de la empresa', placeholder: 'Ej: Bioplanta S.A.S.' },
  { key: 'empresa_nit', label: 'NIT', placeholder: 'Ej: 900.123.456-7' },
  { key: 'empresa_direccion', label: 'Dirección', placeholder: 'Ej: Cra 45 # 12-34' },
  { key: 'empresa_ciudad', label: 'Ciudad', placeholder: 'Ej: Bogotá, Cundinamarca' },
  { key: 'empresa_telefono', label: 'Teléfono', type: 'tel', placeholder: 'Ej: +57 (1) 234 5678' },
  { key: 'empresa_correo', label: 'Correo electrónico', type: 'email', placeholder: 'Ej: contacto@empresa.com' },
];

function EmpresaSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={styles.skeletonField}>
          <div className={styles.skeletonLabel} />
          <div className={styles.skeletonInput} />
        </div>
      ))}
    </div>
  );
}

export function EmpresaSection() {
  const {
    form,
    isLoading,
    isSaving,
    isPickingLogo,
    error,
    isDirty,
    setField,
    pickLogo,
    save,
    reload,
  } = useEmpresaConfig();

  const logoPreview = form.empresa_logo_path || null;

  return (
    <section className={styles.section} aria-labelledby="empresa-section-title">
      <h2 id="empresa-section-title" className={styles.title}>
        Información de la empresa
      </h2>
      <div className={styles.separator} />

      {isLoading && <EmpresaSkeleton />}

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
          <div className={styles.logoRow}>
            <div className={styles.logoPreviewWrap}>
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo de la empresa"
                  className={styles.logoImg}
                />
              ) : (
                <div className={styles.logoPlaceholder} aria-hidden>
                  <ImagePlus size={22} strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className={styles.logoActions}>
              <p className={styles.logoLabel}>Logo de la empresa</p>
              <p className={styles.logoHint}>Se muestra en el encabezado de los tiquetes.</p>
              <div className={styles.logoBtnRow}>
                <button
                  type="button"
                  className={styles.logoPickBtn}
                  onClick={() => void pickLogo()}
                  disabled={isPickingLogo || isSaving}
                  aria-label="Seleccionar imagen del logo"
                >
                  {isPickingLogo ? (
                    <Loader2 size={14} className={styles.spin} aria-hidden />
                  ) : (
                    <ImagePlus size={14} aria-hidden />
                  )}
                  {isPickingLogo ? 'Cargando...' : 'Seleccionar imagen'}
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    className={styles.logoRemoveBtn}
                    onClick={() => setField('empresa_logo_path', '')}
                    disabled={isSaving}
                    aria-label="Eliminar logo"
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={styles.fields}>
            {FIELDS.map(({ key, label, type, placeholder }) => (
              <div key={key} className={styles.fieldRow}>
                <label htmlFor={key} className={styles.fieldLabel}>
                  {label}
                </label>
                <input
                  id={key}
                  type={type ?? 'text'}
                  className={styles.fieldInput}
                  value={form[key]}
                  placeholder={placeholder}
                  onChange={(e) => setField(key, e.target.value)}
                  disabled={isSaving}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={() => void save()}
              disabled={!isDirty || isSaving}
              aria-busy={isSaving}
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
        </div>
      )}
    </section>
  );
}
