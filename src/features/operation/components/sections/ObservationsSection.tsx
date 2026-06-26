import { SectionCard } from '../SectionCard/SectionCard';
import { useOperationFormContext } from '../OperationForm/OperationFormContext';
import styles from './ObservationsSection.module.css';

interface ObservationsSectionProps {
  sectionStyle?: React.CSSProperties;
  exiting?: boolean;
}

export function ObservationsSection({ sectionStyle, exiting }: ObservationsSectionProps) {
  const { formik } = useOperationFormContext();

  return (
    <SectionCard title="Observaciones" style={sectionStyle} exiting={exiting} growable>
      <div className={styles.sectionGrid}>
        <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
          <label className={styles.fieldLabel} htmlFor="observaciones">
            Observaciones
          </label>
          <textarea
            id="observaciones"
            name="observaciones"
            className={`${styles.textInput} ${styles.textArea}`}
            value={formik.values.observaciones}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
        </div>
      </div>
    </SectionCard>
  );
}
