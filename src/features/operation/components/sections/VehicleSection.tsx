import { AlertCircle } from 'lucide-react';
import { getConductores } from '../../api/catalogs.api';
import { useCatalogLoader } from '../../hooks/useCatalogLoader';
import { Combobox } from '../Combobox/Combobox';
import { SectionCard } from '../SectionCard/SectionCard';
import { useOperationFormContext } from '../OperationForm/OperationFormContext';
import styles from './VehicleSection.module.css';

interface VehicleSectionProps {
  sectionStyle?: React.CSSProperties;
  exiting?: boolean;
}

export function VehicleSection({ sectionStyle, exiting }: VehicleSectionProps) {
  const { formik, auth, isPhase2 } = useOperationFormContext();
  const loadConductores = useCatalogLoader(() => getConductores(auth));

  return (
    <SectionCard title="Vehículo" style={sectionStyle} exiting={exiting}>
      <div className={styles.sectionGrid}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="placa">
            Placa<span className={styles.requiredMark}> *</span>
          </label>
          <input
            id="placa"
            name="placa"
            className={`${styles.textInput} ${
              formik.touched.placa && formik.errors.placa ? styles.textInputError : ''
            }`}
            value={formik.values.placa}
            disabled={isPhase2}
            onChange={(e) => formik.setFieldValue('placa', e.target.value.toUpperCase())}
            onBlur={formik.handleBlur}
          />
          {formik.touched.placa && formik.errors.placa && (
            <p className={styles.fieldError}>
              <AlertCircle size={12} aria-hidden />
              {formik.errors.placa}
            </p>
          )}
        </div>

        <Combobox
          name="cedulaCiudadania"
          label="Cédula"
          required
          disabled={isPhase2}
          value={formik.values.cedulaCiudadania}
          error={formik.errors.cedulaCiudadania}
          touched={formik.touched.cedulaCiudadania}
          loadOptions={loadConductores}
          getOptionLabel={(c) => String(c.Cedula)}
          filterOption={(c, q) =>
            String(c.Cedula).includes(q) || c.Nombre.toLowerCase().includes(q)
          }
          onSelect={(c) => {
            formik.setFieldValue('conductor', c.Nombre);
            formik.setFieldValue('cedulaCiudadania', String(c.Cedula));
          }}
          onClear={() => {
            formik.setFieldValue('cedulaCiudadania', '');
            formik.setFieldValue('conductor', '');
          }}
          onBlur={() => formik.setFieldTouched('cedulaCiudadania', true)}
        />

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="conductor">
            Conductor<span className={styles.requiredMark}> *</span>
          </label>
          <input
            id="conductor"
            name="conductor"
            className={`${styles.textInput} ${
              formik.touched.conductor && formik.errors.conductor ? styles.textInputError : ''
            }`}
            value={formik.values.conductor}
            disabled={isPhase2}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
          {formik.touched.conductor && formik.errors.conductor && (
            <p className={styles.fieldError}>
              <AlertCircle size={12} aria-hidden />
              {formik.errors.conductor}
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
