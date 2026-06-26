import { useEffect, useMemo } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useBusinessRulesContext } from '../../../context/BusinessRulesContext';
import { createTransitRecord, registerSalida } from '../api/transit.api';
import { ApiUnauthorizedError } from '../api/api.config';
import {
  ApiAuth,
  CreateTransitResponse,
  ApiResponseError,
  OperationFormValues,
  OperationMode,
  SalidaResponse,
  TransitRecord,
} from '../types/operation.types';
import { mapApiErrorMessage } from '../utils/transit.utils';
import { AuthUser } from '../../auth/types/auth.types';

const MAX_WEIGHT_KG = 99999;

function validateLiveWeight(liveWeight: number, reglaPesoMinimoActiva: boolean): string | null {
  const peso = Math.round(liveWeight);
  if (!Number.isFinite(peso)) {
    return 'El peso registrado no es válido.';
  }
  if (peso < 0) {
    return 'El peso registrado no es válido.';
  }
  if (reglaPesoMinimoActiva && peso <= 0) {
    return 'La báscula marca cero. Verifique que el vehículo esté sobre la báscula antes de registrar.';
  }
  if (peso > MAX_WEIGHT_KG) {
    return 'El peso registrado supera la capacidad máxima de la báscula (99.999 kg).';
  }
  return null;
}

function computeSalidaNeto(transitRecord: TransitRecord, liveWeight: number): number {
  const peso = Math.round(liveWeight);
  if (transitRecord.caso === 'Ingreso') {
    return transitRecord.bruto - peso;
  }
  return peso - transitRecord.tara;
}

function validateNetoSalida(neto: number, reglaPesoSalidaMinimoActiva: boolean): string | null {
  if (!Number.isFinite(neto)) {
    return 'El peso neto no es válido.';
  }
  if (reglaPesoSalidaMinimoActiva && neto <= 0) {
    if (neto === 0) {
      return 'El peso neto es cero. El vehículo debe completar la operación antes de registrar la salida.';
    }
    return 'El peso de salida es mayor que el peso de entrada. Verifique que el vehículo correcto esté en la báscula.';
  }
  if (!reglaPesoSalidaMinimoActiva && neto < 0) {
    return 'El peso de salida es mayor que el peso de entrada. Verifique que el vehículo correcto esté en la báscula.';
  }
  if (neto > MAX_WEIGHT_KG) {
    return 'El peso bruto calculado supera la capacidad máxima de la báscula.';
  }
  return null;
}

function getInitialValues(transitRecord: TransitRecord | null): OperationFormValues {
  return {
    placa: transitRecord?.placa ?? '',
    cedulaCiudadania: transitRecord?.cedula ? String(transitRecord.cedula) : '',
    conductor: transitRecord?.conductor ?? '',
    nitCliente: '',
    planta: transitRecord?.planta ?? '',
    clienteProveedor: transitRecord?.cliente_proveedor ?? '',
    destino: transitRecord?.origen_destino ?? '',
    productoMateria: transitRecord?.materiaPrima_producto ?? '',
    transportadora: transitRecord?.transportadora ?? '',
    no_sello: transitRecord?.no_sello ?? '',
    no_shipment: transitRecord?.no_shipment ?? '',
    no_r: transitRecord?.no_r ?? '',
    no_contenedor: transitRecord?.no_contenedor ?? '',
    observaciones: '',
    materiaAutoFromOrigen: false,
  };
}

function getEffectiveCase(
  mode: OperationMode,
  transitRecord: TransitRecord | null,
): 'ingreso' | 'despacho' | null {
  if (mode === 'transito' && transitRecord) {
    return transitRecord.caso === 'Ingreso' ? 'ingreso' : 'despacho';
  }
  if (mode === 'ingreso' || mode === 'despacho') return mode;
  return null;
}

function buildValidationSchema(
  mode: OperationMode,
  transitRecord: TransitRecord | null,
): Yup.ObjectSchema<OperationFormValues> {
  const effective = getEffectiveCase(mode, transitRecord);
  const isPhase2 = Boolean(transitRecord);
  const isIngresoPhase2 = effective === 'ingreso' && isPhase2;

  if (isIngresoPhase2) {
    return Yup.object({}) as Yup.ObjectSchema<OperationFormValues>;
  }

  const base = {
    placa: Yup.string().required('Placa requerida'),
    cedulaCiudadania: Yup.string().required('Cédula requerida'),
    conductor: Yup.string().required('Conductor requerido'),
    planta: Yup.string().required('Planta requerida'),
    clienteProveedor: Yup.string().required(
      effective === 'despacho' ? 'Cliente requerido' : 'Proveedor requerido',
    ),
    transportadora: Yup.string().required('Transportadora requerida'),
    no_sello: Yup.string().max(300, 'Máximo 300 caracteres').optional(),
  };

  if (effective === 'ingreso' && !isPhase2) {
    return Yup.object({
      ...base,
      destino: Yup.string().required('Origen requerido'),
      productoMateria: Yup.string().required('Materia prima requerida'),
    }) as Yup.ObjectSchema<OperationFormValues>;
  }

  if (effective === 'despacho' && !isPhase2) {
    return Yup.object({
      ...base,
      destino: Yup.string().required('Destino requerido'),
      productoMateria: Yup.string().required('Producto requerido'),
    }) as Yup.ObjectSchema<OperationFormValues>;
  }

  return Yup.object({}) as Yup.ObjectSchema<OperationFormValues>;
}

interface UseOperationFormParams {
  mode: OperationMode | null;
  transitRecord: TransitRecord | null;
  liveWeight: number;
  auth: ApiAuth | null;
  user: AuthUser | null;
  modeVersion: number;
  onSuccess: (
    type: 'transit' | 'ingreso' | 'despacho',
    payload?: CreateTransitResponse | SalidaResponse,
  ) => void;
  onUnauthorized: () => void;
  onNotify: (type: 'success' | 'error', message: string, onRetry?: () => void) => void;
}

export function useOperationForm({
  mode,
  transitRecord,
  liveWeight,
  auth,
  user,
  modeVersion,
  onSuccess,
  onUnauthorized,
  onNotify,
}: UseOperationFormParams) {
  const { regla_peso_minimo_activa, regla_peso_salida_minimo_activa } = useBusinessRulesContext();
  const validationSchema = useMemo(
    () => (mode ? buildValidationSchema(mode, transitRecord) : Yup.object({})),
    [mode, transitRecord],
  );

  const formik = useFormik<OperationFormValues>({
    initialValues: getInitialValues(transitRecord),
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!auth?.token || !user || !mode) return;

      const effective = getEffectiveCase(mode, transitRecord);
      const isSalida = Boolean(
        transitRecord && (effective === 'ingreso' || effective === 'despacho'),
      );

      if (isSalida && transitRecord) {
        const weightError = validateLiveWeight(liveWeight, regla_peso_salida_minimo_activa);
        if (weightError) {
          onNotify('error', weightError);
          return;
        }

        const netoError = validateNetoSalida(
          computeSalidaNeto(transitRecord, liveWeight),
          regla_peso_salida_minimo_activa,
        );
        if (netoError) {
          onNotify('error', netoError);
          return;
        }
      } else {
        const weightError = validateLiveWeight(liveWeight, regla_peso_minimo_activa);
        if (weightError) {
          onNotify('error', weightError);
          return;
        }
      }

      try {
        if ((mode === 'ingreso' || mode === 'despacho') && !transitRecord) {
          const result = await createTransitRecord(auth, {
            placa: values.placa.toUpperCase(),
            caso: mode === 'ingreso' ? 'Ingreso' : 'Despacho',
            conductor: values.conductor,
            cedula: parseInt(values.cedulaCiudadania, 10) || 0,
            planta: values.planta,
            materiaPrima_producto: values.productoMateria,
            cliente_proveedor: values.clienteProveedor,
            transportadora: values.transportadora,
            origen_destino: values.destino,
            primer_peso: liveWeight,
            no_sello: values.no_sello || null,
            no_shipment: values.no_shipment || null,
            no_r: values.no_r || null,
            no_contenedor: values.no_contenedor || null,
            observaciones: values.observaciones || null,
          });

          onNotify('success', 'Vehículo puesto en tránsito correctamente.');
          formik.resetForm({ values: getInitialValues(null) });
          onSuccess('transit', result);
          return;
        }

        if (effective === 'ingreso' && transitRecord) {
          const salida = await registerSalida(auth, transitRecord.placa, {
            segundo_peso: liveWeight,
            observaciones: values.observaciones || null,
          });

          onNotify('success', `Salida registrada. Tiquete No. ${salida.no_tiquete}`);
          onSuccess('ingreso', salida);
          return;
        }

        if (effective === 'despacho' && transitRecord) {
          const salida = await registerSalida(auth, transitRecord.placa, {
            segundo_peso: liveWeight,
            observaciones: values.observaciones || null,
          });

          onNotify('success', `Salida registrada. Tiquete No. ${salida.no_tiquete}`);
          onSuccess('despacho', salida);
        }
      } catch (error) {
        if (error instanceof ApiUnauthorizedError) {
          onUnauthorized();
          return;
        }
        const message =
          error instanceof ApiResponseError
            ? mapApiErrorMessage(error)
            : mapApiErrorMessage(error);
        onNotify('error', message, () => formik.submitForm());
      }
    },
  });

  useEffect(() => {
    formik.resetForm({ values: getInitialValues(transitRecord) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeVersion, transitRecord?.id]);

  return {
    formik,
    isSubmitting: formik.isSubmitting,
  };
}

export function getEffectiveOperationType(
  mode: OperationMode | null,
  transitRecord: TransitRecord | null,
): 'ingreso' | 'despacho' | null {
  if (!mode) return null;
  return getEffectiveCase(mode, transitRecord);
}

export function isPhase2(transitRecord: TransitRecord | null): boolean {
  return transitRecord !== null;
}
