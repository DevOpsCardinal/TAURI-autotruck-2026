import { createContext, useContext } from 'react';
import { FormikProps } from 'formik';
import { ApiAuth, OperationFormValues, OperationMode, TransitRecord } from '../../types/operation.types';

export interface OperationFormContextValue {
  formik: FormikProps<OperationFormValues>;
  mode: OperationMode;
  transitRecord: TransitRecord | null;
  auth: ApiAuth;
  effectiveType: 'ingreso' | 'despacho';
  isPhase2: boolean;
}

const OperationFormContext = createContext<OperationFormContextValue | null>(null);

export function OperationFormProvider({
  value,
  children,
}: {
  value: OperationFormContextValue;
  children: React.ReactNode;
}) {
  return (
    <OperationFormContext.Provider value={value}>{children}</OperationFormContext.Provider>
  );
}

export function useOperationFormContext(): OperationFormContextValue {
  const ctx = useContext(OperationFormContext);
  if (!ctx) throw new Error('useOperationFormContext must be used within OperationFormProvider');
  return ctx;
}
