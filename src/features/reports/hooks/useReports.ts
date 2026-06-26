import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getClientes,
  getMaterias,
  getPlantas,
  getProductos,
  getProveedores,
  getTransportadoras,
} from '../../operation/api/catalogs.api';
import type { ApiAuth } from '../../operation/types/operation.types';
import type {
  DespachosFilterState,
  FilterOption,
  FilterOptions,
  IngresosFilterState,
  SortOption,
  TransitFilterState,
} from '../types/reports.types';
import { fetchOperarios } from '../api/reports.api';

const EMPTY_OPTIONS: FilterOptions = {
  plantas: [], proveedores: [], materias: [],
  clientes: [], productos: [], transportadoras: [], operarios: [],
};

function useCatalogList<T>(
  auth: ApiAuth | null,
  fetcher: (auth: ApiAuth) => Promise<T[]>,
  toOption: (item: T) => FilterOption,
): FilterOption[] {
  const [items, setItems] = useState<FilterOption[]>([]);

  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    fetcher(auth)
      .then((data) => {
        if (!cancelled) {
          setItems(data.map(toOption).filter((o) => Boolean(o.label)));
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  return items;
}

export function usePlantas(auth: ApiAuth | null) {
  return useCatalogList(auth, getPlantas, (p) => ({ label: p.Nombre, value: p.Nombre }));
}

export function useProveedores(auth: ApiAuth | null) {
  return useCatalogList(auth, getProveedores, (p) => ({ label: p.Nombre, value: p.Nombre }));
}

export function useMaterias(auth: ApiAuth | null) {
  return useCatalogList(auth, getMaterias, (m) => ({ label: m.Nombre, value: m.Nombre }));
}

export function useTransportadoras(auth: ApiAuth | null) {
  return useCatalogList(auth, getTransportadoras, (t) => ({ label: t.Nombre, value: t.Nombre }));
}

export function useClientes(auth: ApiAuth | null) {
  return useCatalogList(auth, getClientes, (c) => ({ label: c.Nombre, value: c.Nombre }));
}

export function useProductos(auth: ApiAuth | null) {
  return useCatalogList(auth, getProductos, (p) => ({ label: p.Nombre, value: p.Nombre }));
}

export function useOperarios(auth: ApiAuth | null): FilterOption[] {
  const [operarios, setOperarios] = useState<FilterOption[]>([]);

  useEffect(() => {
    if (!auth) return;
    let cancelled = false;
    fetchOperarios(auth)
      .then((data) => {
        if (!cancelled) setOperarios(data.map((nick) => ({ label: nick, value: nick })));
      })
      .catch(() => {
        if (!cancelled) setOperarios([]);
      });
    return () => { cancelled = true; };
  }, [auth]);

  return operarios;
}

export function useIngresosOptions(auth: ApiAuth | null): FilterOptions {
  const plantas = usePlantas(auth);
  const proveedores = useProveedores(auth);
  const materias = useMaterias(auth);
  const transportadoras = useTransportadoras(auth);
  const operarios = useOperarios(auth);
  return useMemo(
    () => ({ ...EMPTY_OPTIONS, plantas, proveedores, materias, transportadoras, operarios }),
    [plantas, proveedores, materias, transportadoras, operarios],
  );
}

export function useDespachosOptions(auth: ApiAuth | null): FilterOptions {
  const plantas = usePlantas(auth);
  const clientes = useClientes(auth);
  const productos = useProductos(auth);
  const transportadoras = useTransportadoras(auth);
  const operarios = useOperarios(auth);
  return useMemo(
    () => ({ ...EMPTY_OPTIONS, plantas, clientes, productos, transportadoras, operarios }),
    [plantas, clientes, productos, transportadoras, operarios],
  );
}

export function useTransitOptions(auth: ApiAuth | null): FilterOptions {
  const plantas = usePlantas(auth);
  return useMemo(
    () => ({ ...EMPTY_OPTIONS, plantas }),
    [plantas],
  );
}

const DEFAULT_INGRESOS: IngresosFilterState = {
  fecha_desde: '',
  fecha_hasta: '',
  planta: '',
  proveedor: '',
  materia_prima: '',
  transportadora: '',
  placa: '',
  operario: '',
  page: 1,
  limit: 20,
  sort: 'fecha_desc',
};

const DEFAULT_DESPACHOS: DespachosFilterState = {
  fecha_desde: '',
  fecha_hasta: '',
  planta: '',
  cliente: '',
  producto: '',
  transportadora: '',
  placa: '',
  operario: '',
  page: 1,
  limit: 20,
  sort: 'fecha_desc',
};

const DEFAULT_TRANSIT: TransitFilterState = {
  fecha_desde: '',
  fecha_hasta: '',
  estado: '',
  caso: '',
  planta: '',
  placa: '',
  page: 1,
  limit: 20,
  sort: 'fecha_desc',
};

function readString(sp: URLSearchParams, key: string, fallback = ''): string {
  return sp.get(key) ?? fallback;
}

function readNumber(sp: URLSearchParams, key: string, fallback: number): number {
  const v = Number(sp.get(key));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function useIngresosFiltersFromUrl(): [IngresosFilterState, (f: IngresosFilterState) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<IngresosFilterState>(() => ({
    fecha_desde: readString(searchParams, 'fecha_desde'),
    fecha_hasta: readString(searchParams, 'fecha_hasta'),
    planta: readString(searchParams, 'planta'),
    proveedor: readString(searchParams, 'proveedor'),
    materia_prima: readString(searchParams, 'materia_prima'),
    transportadora: readString(searchParams, 'transportadora'),
    placa: readString(searchParams, 'placa'),
    operario: readString(searchParams, 'operario'),
    page: readNumber(searchParams, 'page', 1),
    limit: readNumber(searchParams, 'limit', 20),
    sort: readString(searchParams, 'sort', 'fecha_desc') as SortOption,
  }), [searchParams]);

  const setFilters = useCallback((next: IngresosFilterState) => {
    const sp = new URLSearchParams();
    const entries: [string, string | number][] = [
      ['fecha_desde', next.fecha_desde],
      ['fecha_hasta', next.fecha_hasta],
      ['planta', next.planta],
      ['proveedor', next.proveedor],
      ['materia_prima', next.materia_prima],
      ['transportadora', next.transportadora],
      ['placa', next.placa],
      ['operario', next.operario],
      ['page', next.page],
      ['limit', next.limit],
      ['sort', next.sort],
    ];
    for (const [k, v] of entries) {
      if (v !== '' && v !== undefined && !(k === 'page' && v === 1) && !(k === 'limit' && v === 20) && !(k === 'sort' && v === 'fecha_desc')) {
        sp.set(k, String(v));
      }
    }
    setSearchParams(sp, { replace: true });
  }, [setSearchParams]);

  return [filters, setFilters];
}

export function useDespachosFiltersFromUrl(): [DespachosFilterState, (f: DespachosFilterState) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<DespachosFilterState>(() => ({
    fecha_desde: readString(searchParams, 'fecha_desde'),
    fecha_hasta: readString(searchParams, 'fecha_hasta'),
    planta: readString(searchParams, 'planta'),
    cliente: readString(searchParams, 'cliente'),
    producto: readString(searchParams, 'producto'),
    transportadora: readString(searchParams, 'transportadora'),
    placa: readString(searchParams, 'placa'),
    operario: readString(searchParams, 'operario'),
    page: readNumber(searchParams, 'page', 1),
    limit: readNumber(searchParams, 'limit', 20),
    sort: readString(searchParams, 'sort', 'fecha_desc') as SortOption,
  }), [searchParams]);

  const setFilters = useCallback((next: DespachosFilterState) => {
    const sp = new URLSearchParams();
    const entries: [string, string | number][] = [
      ['fecha_desde', next.fecha_desde],
      ['fecha_hasta', next.fecha_hasta],
      ['planta', next.planta],
      ['cliente', next.cliente],
      ['producto', next.producto],
      ['transportadora', next.transportadora],
      ['placa', next.placa],
      ['operario', next.operario],
      ['page', next.page],
      ['limit', next.limit],
      ['sort', next.sort],
    ];
    for (const [k, v] of entries) {
      if (v !== '' && v !== undefined && !(k === 'page' && v === 1) && !(k === 'limit' && v === 20) && !(k === 'sort' && v === 'fecha_desc')) {
        sp.set(k, String(v));
      }
    }
    setSearchParams(sp, { replace: true });
  }, [setSearchParams]);

  return [filters, setFilters];
}

export function useTransitFiltersFromUrl(): [TransitFilterState, (f: TransitFilterState) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<TransitFilterState>(() => ({
    fecha_desde: readString(searchParams, 'fecha_desde'),
    fecha_hasta: readString(searchParams, 'fecha_hasta'),
    estado: readString(searchParams, 'estado') as TransitFilterState['estado'],
    caso: readString(searchParams, 'caso') as TransitFilterState['caso'],
    planta: readString(searchParams, 'planta'),
    placa: readString(searchParams, 'placa'),
    page: readNumber(searchParams, 'page', 1),
    limit: readNumber(searchParams, 'limit', 20),
    sort: readString(searchParams, 'sort', 'fecha_desc') as TransitFilterState['sort'],
  }), [searchParams]);

  const setFilters = useCallback((next: TransitFilterState) => {
    const sp = new URLSearchParams();
    const entries: [string, string | number][] = [
      ['fecha_desde', next.fecha_desde],
      ['fecha_hasta', next.fecha_hasta],
      ['estado', next.estado],
      ['caso', next.caso],
      ['planta', next.planta],
      ['placa', next.placa],
      ['page', next.page],
      ['limit', next.limit],
      ['sort', next.sort],
    ];
    for (const [k, v] of entries) {
      if (v !== '' && v !== undefined && !(k === 'page' && v === 1) && !(k === 'limit' && v === 20) && !(k === 'sort' && v === 'fecha_desc')) {
        sp.set(k, String(v));
      }
    }
    setSearchParams(sp, { replace: true });
  }, [setSearchParams]);

  return [filters, setFilters];
}

export {
  DEFAULT_INGRESOS,
  DEFAULT_DESPACHOS,
  DEFAULT_TRANSIT,
};
