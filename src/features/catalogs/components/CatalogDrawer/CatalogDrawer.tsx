import { AlertCircle, X } from 'lucide-react';
import { useFormik } from 'formik';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Yup from 'yup';
import { ApiAuth, ApiResponseError } from '../../../operation/types/operation.types';
import { createRecord, updateRecord } from '../../api/catalogs-crud.api';
import {
  CATALOG_FORM_FIELDS,
  CATALOG_TITLES,
  CatalogKey,
  CatalogRecord,
  FormFieldDef,
} from '../../types/catalog.types';
import styles from './CatalogDrawer.module.css';

interface CatalogDrawerProps {
  catalogKey: CatalogKey;
  mode: 'create' | 'edit';
  record: CatalogRecord | null;
  auth: ApiAuth;
  onSuccess: () => void;
  onClose: () => void;
}

function buildInitialValues(fields: FormFieldDef[], record: CatalogRecord | null): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const raw = record?.[field.name];
    values[field.name] = raw === null || raw === undefined ? '' : String(raw);
  }
  return values;
}

function buildValidationSchema(fields: FormFieldDef[]) {
  const shape: Record<string, Yup.AnySchema> = {};

  for (const field of fields) {
    if (field.type === 'number') {
      let schema = Yup.number()
        .typeError('Debe ser un número entero')
        .integer('Debe ser un número entero')
        .min(1_000_000, 'Mínimo 7 dígitos')
        .max(999_999_999_999, 'Máximo 12 dígitos');
      if (field.required) {
        schema = schema.required('Campo requerido');
      }
      shape[field.name] = schema;
    } else if (field.type === 'date') {
      let schema = Yup.string().trim();
      if (field.required) {
        schema = schema.required('Campo requerido');
      }
      shape[field.name] = schema;
    } else {
      let schema = Yup.string().trim();
      if (field.required) {
        schema = schema.required('Campo requerido');
      }
      if (field.maxLength) {
        schema = schema.max(field.maxLength, `Máximo ${field.maxLength} caracteres`);
      }
      shape[field.name] = schema;
    }
  }

  return Yup.object(shape);
}

function buildSubmitBody(
  fields: FormFieldDef[],
  values: Record<string, string>,
  mode: 'create' | 'edit',
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.editOnly && mode === 'create') continue;
    if (field.readOnly) continue;
    // createOnly fields are locked in the UI but their value still travels to the backend
    // so the backend can validate uniqueness (NIT, Cedula). They are read from formik state
    // which was initialized from the saved record and cannot be changed by the user.

    const value = values[field.name]?.trim() ?? '';
    if (field.type === 'number') {
      body[field.name] = value === '' ? null : Number(value);
    } else {
      body[field.name] = value === '' ? null : value;
    }
  }
  return body;
}

export function CatalogDrawer({
  catalogKey,
  mode,
  record,
  auth,
  onSuccess,
  onClose,
}: CatalogDrawerProps) {
  const fields = useMemo(
    () => CATALOG_FORM_FIELDS[catalogKey].filter(
      (field) => !(field.editOnly && mode === 'create'),
    ),
    [catalogKey, mode],
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const initialValues = useMemo(
    () => buildInitialValues(fields, record),
    [fields, record],
  );

  const validationSchema = useMemo(() => buildValidationSchema(fields), [fields]);

  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);
      setFieldErrors({});
      try {
        const body = buildSubmitBody(fields, values, mode);
        if (mode === 'create') {
          await createRecord(auth, catalogKey, body);
        } else if (record?.id !== undefined && record?.id !== null) {
          await updateRecord(auth, catalogKey, Number(record.id), body);
        }
        onSuccess();
      } catch (error) {
        if (error instanceof ApiResponseError) {
          setServerError(error.message);
          if (error.errors) {
            const next: Record<string, string> = {};
            for (const item of error.errors) {
              next[item.field] = item.message;
            }
            setFieldErrors(next);
          }
        } else {
          setServerError('No se pudo guardar el registro. Intenta de nuevo.');
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsClosing(true);
    window.setTimeout(() => onClose(), 150);
  }, [onClose]);

  const handleRequestClose = useCallback(() => {
    if (formik.dirty) {
      setShowDiscardConfirm(true);
      return;
    }
    closeDrawer();
  }, [formik.dirty, closeDrawer]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleRequestClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRequestClose]);

  const title = mode === 'create'
    ? `Nuevo ${CATALOG_TITLES[catalogKey]}`
    : `Editar ${CATALOG_TITLES[catalogKey]}`;

  return (
    <>
      <div
        className={styles.backdrop}
        onClick={handleRequestClose}
        aria-hidden
      />
      <aside
        className={`${styles.drawer} ${isVisible && !isClosing ? styles.drawerOpen : styles.drawerClosed}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-drawer-title"
      >
        <div className={styles.drawerHeader}>
          <h3 id="catalog-drawer-title">{title}</h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleRequestClose}
            aria-label="Cerrar"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <form className={styles.drawerBody} onSubmit={formik.handleSubmit} noValidate>
          {fields.filter((field) => !(field.editOnly && mode === 'create')).map((field) => {
            const isLocked = field.readOnly || (field.createOnly === true && mode === 'edit');
            const error = !isLocked && (fieldErrors[field.name] ?? (formik.touched[field.name] ? formik.errors[field.name] : undefined));
            return (
              <div key={field.name} className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor={`drawer-${field.name}`}>
                  {field.label}
                  {field.required && !isLocked && <span className={styles.required}>*</span>}
                  {isLocked && mode === 'edit' && (
                    <span className={styles.lockedBadge}>No editable</span>
                  )}
                </label>
                <input
                  id={`drawer-${field.name}`}
                  name={field.name}
                  type={field.type === 'date' ? 'date' : 'text'}
                  inputMode={field.type === 'number' ? 'numeric' : undefined}
                  className={`${styles.textInput} ${error ? styles.textInputError : ''} ${isLocked ? styles.textInputReadOnly : ''}`}
                  placeholder={field.placeholder}
                  value={formik.values[field.name]}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isLocked}
                  disabled={isLocked}
                />
                {error && (
                  <p className={styles.fieldError}>
                    <AlertCircle size={12} aria-hidden />
                    {error}
                  </p>
                )}
              </div>
            );
          })}

          {serverError && !Object.keys(fieldErrors).length && (
            <div className={styles.errorBanner}>{serverError}</div>
          )}
        </form>

        <div className={styles.drawerFooter}>
          <button type="button" className={styles.cancelBtn} onClick={handleRequestClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={formik.isSubmitting}
            onClick={() => formik.handleSubmit()}
          >
            Guardar
          </button>
        </div>
      </aside>

      {showDiscardConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog} role="alertdialog" aria-labelledby="discard-title">
            <h4 id="discard-title">¿Descartar cambios?</h4>
            <p>Los cambios sin guardar se perderán.</p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowDiscardConfirm(false)}>
                Seguir editando
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={() => {
                  setShowDiscardConfirm(false);
                  closeDrawer();
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
