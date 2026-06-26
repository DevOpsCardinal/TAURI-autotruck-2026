import { useEffect, useState } from 'react';
import { FormikProps } from 'formik';
import { getEffectiveOperationType } from '../../hooks/useOperationForm';
import { ApiAuth, OperationFormValues, OperationMode, TransitRecord } from '../../types/operation.types';
import { ActionBar } from '../ActionBar/ActionBar';
import { CargoDataSection } from '../sections/CargoDataSection';
import { CargoSection } from '../sections/CargoSection';
import { LogisticsSection } from '../sections/LogisticsSection';
import { ObservationsSection } from '../sections/ObservationsSection';
import { VehicleSection } from '../sections/VehicleSection';
import { OperationFormProvider } from './OperationFormContext';
import styles from './OperationForm.module.css';

interface OperationFormProps {
  mode: OperationMode;
  transitRecord: TransitRecord | null;
  auth: ApiAuth;
  formik: FormikProps<OperationFormValues>;
  isSubmitting: boolean;
}

function useConditionalSection(show: boolean) {
  const [visible, setVisible] = useState(show);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setExiting(false);
      return;
    }

    if (!visible) return;

    setExiting(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [show, visible]);

  return { visible, exiting };
}

function staggerDelay(index: number): React.CSSProperties {
  return { animationDelay: `${index * 50}ms` };
}

export function OperationForm({
  mode,
  transitRecord,
  auth,
  formik,
  isSubmitting,
}: OperationFormProps) {
  const effectiveType = getEffectiveOperationType(mode, transitRecord) ?? 'ingreso';
  const isPhase2 = transitRecord !== null;
  const showCargoData = !isPhase2;

  const cargoData = useConditionalSection(showCargoData);

  let staggerIndex = 0;
  const nextStagger = () => staggerDelay(staggerIndex++);

  return (
    <OperationFormProvider
      value={{
        formik,
        mode,
        transitRecord,
        auth,
        effectiveType,
        isPhase2,
      }}
    >
      <form className={styles.formPanel} onSubmit={formik.handleSubmit} noValidate>
        <div className={styles.sectionsStack}>
          <VehicleSection sectionStyle={nextStagger()} />
          <LogisticsSection sectionStyle={nextStagger()} />
          <CargoSection sectionStyle={nextStagger()} />
          {cargoData.visible && (
            <CargoDataSection
              sectionStyle={nextStagger()}
              exiting={cargoData.exiting}
            />
          )}
          <ObservationsSection sectionStyle={nextStagger()} />
        </div>
        <ActionBar mode={mode} transitRecord={transitRecord} isSubmitting={isSubmitting} />
      </form>
    </OperationFormProvider>
  );
}
