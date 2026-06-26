import { useEffect, useRef, useState } from 'react';
import type {
  DespachosFilterState,
  FilterOptions,
  IngresosFilterState,
  ReportFilterType,
  TransitFilterState,
} from '../../types/reports.types';
import { Combobox } from '../Combobox/Combobox';
import styles from './ReportFilters.module.css';

type FilterStateByType = {
  ingresos: IngresosFilterState;
  despachos: DespachosFilterState;
  transit: TransitFilterState;
};

interface ReportFiltersProps<T extends ReportFilterType> {
  type: T;
  filters: FilterStateByType[T];
  options: FilterOptions;
  onChange: (next: FilterStateByType[T]) => void;
  onClear: () => void;
}

function DateRangeError({ desde, hasta }: { desde: string; hasta: string }) {
  if (!desde || !hasta || desde <= hasta) return null;
  return (
    <span className={styles.fieldError}>
      La fecha de inicio no puede ser posterior a la fecha de fin.
    </span>
  );
}

// Debounce hook only used for Placa (free-text prefix search)
function useDebouncedText(
  value: string,
  onDebounced: (v: string) => void,
  delay = 500,
) {
  const [local, setLocal] = useState(value);
  const callbackRef = useRef(onDebounced);
  callbackRef.current = onDebounced;

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (local !== value) callbackRef.current(local);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [local, value, delay]);

  return [local, setLocal] as const;
}

export function ReportFilters<T extends ReportFilterType>({
  type,
  filters,
  options,
  onChange,
  onClear,
}: ReportFiltersProps<T>) {
  const dateError = Boolean(
    filters.fecha_desde && filters.fecha_hasta && filters.fecha_desde > filters.fecha_hasta,
  );

  const update = (patch: Record<string, string | number>) => {
    onChange({ ...filters, ...patch, page: 1 } as FilterStateByType[T]);
  };

  const [placaLocal, setPlacaLocal] = useDebouncedText(
    filters.placa,
    (v) => update({ placa: v }),
  );

  return (
    <div className={styles.filters}>
      <div className={styles.row}>
        {/* Fecha */}
        <div className={styles.field}>
          <label htmlFor="fecha_desde">Desde</label>
          <input
            id="fecha_desde"
            type="date"
            value={filters.fecha_desde}
            onChange={(e) => update({ fecha_desde: e.target.value })}
          />
          <DateRangeError desde={filters.fecha_desde} hasta={filters.fecha_hasta} />
        </div>
        <div className={styles.field}>
          <label htmlFor="fecha_hasta">Hasta</label>
          <input
            id="fecha_hasta"
            type="date"
            value={filters.fecha_hasta}
            onChange={(e) => update({ fecha_hasta: e.target.value })}
          />
        </div>

        {/* Planta — disponible en todos los tipos */}
        <div className={styles.field}>
          <label htmlFor="planta">Planta</label>
          <Combobox
            id="planta"
            options={options.plantas}
            value={filters.planta}
            placeholder="Buscar planta..."
            onSelect={(v) => update({ planta: v })}
          />
        </div>

        {/* Filtros específicos de Ingresos */}
        {type === 'ingresos' && (
          <>
            <div className={styles.field}>
              <label htmlFor="proveedor">Proveedor</label>
              <Combobox
                id="proveedor"
                options={options.proveedores}
                value={(filters as IngresosFilterState).proveedor}
                placeholder="Buscar proveedor..."
                onSelect={(v) => update({ proveedor: v })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="materia_prima">Materia Prima</label>
              <Combobox
                id="materia_prima"
                options={options.materias}
                value={(filters as IngresosFilterState).materia_prima}
                placeholder="Buscar materia..."
                onSelect={(v) => update({ materia_prima: v })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="transportadora">Transportadora</label>
              <Combobox
                id="transportadora"
                options={options.transportadoras}
                value={(filters as IngresosFilterState).transportadora}
                placeholder="Buscar transportadora..."
                onSelect={(v) => update({ transportadora: v })}
              />
            </div>
          </>
        )}

        {/* Filtros específicos de Despachos */}
        {type === 'despachos' && (
          <>
            <div className={styles.field}>
              <label htmlFor="cliente">Cliente</label>
              <Combobox
                id="cliente"
                options={options.clientes}
                value={(filters as DespachosFilterState).cliente}
                placeholder="Buscar cliente..."
                onSelect={(v) => update({ cliente: v })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="producto">Producto</label>
              <Combobox
                id="producto"
                options={options.productos}
                value={(filters as DespachosFilterState).producto}
                placeholder="Buscar producto..."
                onSelect={(v) => update({ producto: v })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="transportadora">Transportadora</label>
              <Combobox
                id="transportadora"
                options={options.transportadoras}
                value={(filters as DespachosFilterState).transportadora}
                placeholder="Buscar transportadora..."
                onSelect={(v) => update({ transportadora: v })}
              />
            </div>
          </>
        )}

        {/* Filtros específicos de Tránsito */}
        {type === 'transit' && (
          <>
            <div className={styles.field}>
              <label htmlFor="estado">Estado</label>
              <select
                id="estado"
                value={(filters as TransitFilterState).estado}
                onChange={(e) => update({ estado: e.target.value })}
              >
                <option value="">Todos</option>
                <option value="EN_TRANSITO">En Tránsito</option>
                <option value="COMPLETADO">Completado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="caso">Tipo</label>
              <select
                id="caso"
                value={(filters as TransitFilterState).caso}
                onChange={(e) => update({ caso: e.target.value })}
              >
                <option value="">Todos</option>
                <option value="Ingreso">Ingreso</option>
                <option value="Despacho">Despacho</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className={styles.row}>
        {/* Placa — texto libre con debounce en todos los tipos */}
        <div className={styles.field}>
          <label htmlFor="placa">Placa</label>
          <input
            id="placa"
            type="text"
            value={placaLocal}
            placeholder="Ej. ABC123"
            onChange={(e) => setPlacaLocal(e.target.value.toUpperCase())}
          />
        </div>

        {/* Operario — combobox en ingresos y despachos */}
        {type !== 'transit' && (
          <div className={styles.field}>
            <label htmlFor="operario">Operario</label>
            <Combobox
              id="operario"
              options={options.operarios}
              value={(filters as IngresosFilterState | DespachosFilterState).operario}
              placeholder="Buscar operario..."
              onSelect={(v) => update({ operario: v })}
            />
          </div>
        )}

        <button
          type="button"
          className={styles.clearButton}
          onClick={onClear}
          disabled={dateError}
        >
          × Limpiar todo
        </button>
      </div>
    </div>
  );
}

export function ReportInfoBar({
  from,
  to,
  total,
  netoTotal,
}: {
  from: number;
  to: number;
  total: number;
  netoTotal?: number;
}) {
  return (
    <div className={styles.infoBar}>
      <span>
        Mostrando {from}–{to} de {total} registros
      </span>
      {netoTotal !== undefined ? (
        <span>
          Neto total: <strong>{new Intl.NumberFormat('es-CO').format(netoTotal)} kg</strong>
        </span>
      ) : null}
    </div>
  );
}
