import { useEffect, useState } from 'react';
import { getMaterias, getProductos, getTransportadoras } from '../../api/catalogs.api';
import { useCatalogLoader } from '../../hooks/useCatalogLoader';
import { Combobox } from '../Combobox/Combobox';
import { SectionCard } from '../SectionCard/SectionCard';
import { useOperationFormContext } from '../OperationForm/OperationFormContext';
import styles from './CargoSection.module.css';

interface CargoSectionProps {
  sectionStyle?: React.CSSProperties;
  exiting?: boolean;
}

export function CargoSection({ sectionStyle, exiting }: CargoSectionProps) {
  const { formik, auth, effectiveType, isPhase2, transitRecord } = useOperationFormContext();
  const loadTransportadoras = useCatalogLoader(() => getTransportadoras(auth));
  const loadProductos = useCatalogLoader(() => getProductos(auth));
  const loadMaterias = useCatalogLoader(() => getMaterias(auth));
  const [dateTime, setDateTime] = useState(() => new Date().toLocaleString('es-CO'));
  const isIngreso = effectiveType === 'ingreso';
  const showMateriaReadonly =
    isIngreso && !isPhase2 && formik.values.materiaAutoFromOrigen && Boolean(formik.values.productoMateria);

  const dateTimeDisplay =
    isPhase2 && transitRecord
      ? `${transitRecord.fecha_peso_vacio} ${transitRecord.hora_peso_vacio}`
      : dateTime;

  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date().toLocaleString('es-CO'));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SectionCard title="Carga" style={sectionStyle} exiting={exiting}>
      <div className={styles.sectionGrid}>
        {isIngreso ? (
          showMateriaReadonly ? (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="productoMateria">
                Materia Prima
              </label>
              <input
                id="productoMateria"
                name="productoMateria"
                className={`${styles.textInput} ${styles.textInputReadonly}`}
                value={formik.values.productoMateria}
                disabled
                readOnly
              />
            </div>
          ) : (
            <Combobox
              name="productoMateria"
              label="Materia Prima"
              required
              disabled={isPhase2}
              value={formik.values.productoMateria}
              error={formik.errors.productoMateria}
              touched={formik.touched.productoMateria}
              loadOptions={loadMaterias}
              getOptionLabel={(m) => m.Nombre}
              filterOption={(m, q) => m.Nombre.toLowerCase().includes(q)}
              onSelect={(m) => {
                formik.setFieldValue('productoMateria', m.Nombre);
                formik.setFieldValue('materiaAutoFromOrigen', false);
              }}
              onClear={() => formik.setFieldValue('productoMateria', '')}
              onBlur={() => formik.setFieldTouched('productoMateria', true)}
            />
          )
        ) : (
          <Combobox
            name="productoMateria"
            label="Producto"
            disabled={isPhase2}
            value={formik.values.productoMateria}
            loadOptions={loadProductos}
            getOptionLabel={(p) => p.Nombre}
            filterOption={(p, q) => p.Nombre.toLowerCase().includes(q)}
            onSelect={(p) => formik.setFieldValue('productoMateria', p.Nombre)}
            onClear={() => formik.setFieldValue('productoMateria', '')}
          />
        )}

        <Combobox
          name="transportadora"
          label="Transportadora"
          required
          disabled={isPhase2}
          value={formik.values.transportadora}
          error={formik.errors.transportadora}
          touched={formik.touched.transportadora}
          loadOptions={loadTransportadoras}
          getOptionLabel={(t) => t.Nombre}
          filterOption={(t, q) => t.Nombre.toLowerCase().includes(q)}
          onSelect={(t) => formik.setFieldValue('transportadora', t.Nombre)}
          onClear={() => formik.setFieldValue('transportadora', '')}
          onBlur={() => formik.setFieldTouched('transportadora', true)}
        />

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            {isIngreso ? 'Fecha y hora paso Lleno' : 'Fecha y hora paso Vacio'}
          </label>
          <input
            className={`${styles.textInput} ${styles.textInputReadonly}`}
            value={dateTimeDisplay}
            disabled
            readOnly
          />
        </div>
      </div>
    </SectionCard>
  );
}
