import { AlertCircle } from 'lucide-react';
import { SectionCard } from '../SectionCard/SectionCard';
import { useOperationFormContext } from '../OperationForm/OperationFormContext';
import styles from './CargoDataSection.module.css';

interface CargoDataSectionProps {
  sectionStyle?: React.CSSProperties;
  exiting?: boolean;
}

const FIELDS = [
  { name: 'no_shipment', label: '# Shipment' },
  { name: 'no_sello',    label: '# Sello' },
  { name: 'no_r',        label: '# B' },
  { name: 'no_contenedor', label: '# Contenedor' },
] as const;

export function CargoDataSection({ sectionStyle, exiting }: CargoDataSectionProps) {
  const { formik } = useOperationFormContext();

  return (
    <SectionCard title="Datos de carga" style={sectionStyle} conditional exiting={exiting}>
      <div className={styles.sectionGrid}>
        {FIELDS.map(({ name, label }) => (
          <div key={name} className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor={name}>
              {label}
            </label>
            <input
              id={name}
              name={name}
              className={`${styles.textInput} ${
                formik.touched[name] && formik.errors[name] ? styles.textInputError : ''
              }`}
              value={formik.values[name]}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched[name] && formik.errors[name] && (
              <p className={styles.fieldError}>
                <AlertCircle size={12} aria-hidden />
                {formik.errors[name]}
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
