import { SectionCard } from '../SectionCard/SectionCard';
import {
  getClientes,
  getDestinos,
  getOrigenes,
  getPlantas,
  getProveedores,
} from '../../api/catalogs.api';
import { useCatalogLoader } from '../../hooks/useCatalogLoader';
import { Combobox } from '../Combobox/Combobox';
import { useOperationFormContext } from '../OperationForm/OperationFormContext';
import styles from './LogisticsSection.module.css';

interface LogisticsSectionProps {
  sectionStyle?: React.CSSProperties;
  exiting?: boolean;
}

export function LogisticsSection({ sectionStyle, exiting }: LogisticsSectionProps) {
  const { formik, auth, effectiveType, isPhase2 } = useOperationFormContext();
  const loadPlantas = useCatalogLoader(() => getPlantas(auth));
  const loadProveedores = useCatalogLoader(() => getProveedores(auth));
  const loadClientes = useCatalogLoader(() => getClientes(auth));
  const loadOrigenes = useCatalogLoader(() => getOrigenes(auth));
  const loadDestinos = useCatalogLoader(() => getDestinos(auth));
  const isIngreso = effectiveType === 'ingreso';

  return (
    <SectionCard title="Logística" style={sectionStyle} exiting={exiting}>
      <div className={styles.sectionGrid}>
        <Combobox
          name="planta"
          label="Planta"
          required
          disabled={isPhase2}
          value={formik.values.planta}
          error={formik.errors.planta}
          touched={formik.touched.planta}
          loadOptions={loadPlantas}
          getOptionLabel={(p) => p.Nombre}
          filterOption={(p, q) => p.Nombre.toLowerCase().includes(q)}
          onSelect={(p) => formik.setFieldValue('planta', p.Nombre)}
          onClear={() => formik.setFieldValue('planta', '')}
          onBlur={() => formik.setFieldTouched('planta', true)}
        />

        <Combobox
          name="clienteProveedor"
          label={isIngreso ? 'Proveedor' : 'Cliente'}
          required
          disabled={isPhase2}
          value={formik.values.clienteProveedor}
          error={formik.errors.clienteProveedor}
          touched={formik.touched.clienteProveedor}
          loadOptions={isIngreso ? loadProveedores : loadClientes}
          getOptionLabel={(item) => item.Nombre}
          filterOption={(item, q) => item.Nombre.toLowerCase().includes(q)}
          onSelect={(item) => {
            formik.setFieldValue('clienteProveedor', item.Nombre);
            if (!isIngreso && 'NIT' in item) {
              formik.setFieldValue('nitCliente', item.NIT);
            }
          }}
          onClear={() => {
            formik.setFieldValue('clienteProveedor', '');
            if (!isIngreso) formik.setFieldValue('nitCliente', '');
          }}
          onBlur={() => formik.setFieldTouched('clienteProveedor', true)}
        />

        <Combobox
          name="destino"
          label={isIngreso ? 'Origen' : 'Destino'}
          required={!isPhase2}
          disabled={isPhase2}
          value={formik.values.destino}
          error={formik.errors.destino}
          touched={formik.touched.destino}
          loadOptions={isIngreso ? loadOrigenes : loadDestinos}
          getOptionLabel={(item) => item.Nombre}
          filterOption={(item, q) => item.Nombre.toLowerCase().includes(q)}
          onSelect={(item) => {
            formik.setFieldValue('destino', item.Nombre);
            if (isIngreso && 'Materia_Prima_Certificada' in item) {
              const certificada = String(item.Materia_Prima_Certificada ?? '').trim();
              if (certificada) {
                formik.setFieldValue('productoMateria', certificada);
                formik.setFieldValue('materiaAutoFromOrigen', true);
              } else {
                formik.setFieldValue('productoMateria', '');
                formik.setFieldValue('materiaAutoFromOrigen', false);
              }
            }
          }}
          onClear={() => {
            formik.setFieldValue('destino', '');
            if (isIngreso) {
              formik.setFieldValue('productoMateria', '');
              formik.setFieldValue('materiaAutoFromOrigen', false);
            }
          }}
          onBlur={() => formik.setFieldTouched('destino', true)}
        />
      </div>
    </SectionCard>
  );
}
