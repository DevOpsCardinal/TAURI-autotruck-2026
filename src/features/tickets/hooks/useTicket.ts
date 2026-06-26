import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ApiUnauthorizedError } from '../../operation/api/api.config';
import type { ApiAuth } from '../../operation/types/operation.types';
import { fetchDespachoTicketData, fetchIngresoTicketData } from '../services/tickets.api';
import type { FormatoImpresion, TicketData, TipoOperacion } from '../types/ticket.types';
import { DEFAULT_FORMAT_KEY } from '../utils/ticketFormat.utils';

function readDefaultFormat(): FormatoImpresion {
  const stored = localStorage.getItem(DEFAULT_FORMAT_KEY);
  if (stored === 'termico' || stored === 'media-hoja') return stored;
  return 'corporativo';
}

export function useTicket(auth: ApiAuth | null) {
  const [open, setOpen] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [format, setFormatState] = useState<FormatoImpresion>(readDefaultFormat);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setError(null);
    setLoading(false);
  }, []);

  const openWithData = useCallback((data: TicketData) => {
    setTicketData(data);
    setError(null);
    setLoading(false);
    setOpen(true);
  }, []);

  const setFormat = useCallback((next: FormatoImpresion) => {
    setFormatState(next);
    localStorage.setItem(DEFAULT_FORMAT_KEY, next);
  }, []);

  const print = useCallback(() => {
    invoke('print_ticket').catch(() => window.print());
  }, []);

  const openForReprint = useCallback(async (tipo: TipoOperacion, noTiquete: number) => {
    if (!auth) return;
    setOpen(true);
    setLoading(true);
    setError(null);
    setTicketData(null);
    try {
      const data = tipo === 'Ingreso'
        ? await fetchIngresoTicketData(auth, noTiquete)
        : await fetchDespachoTicketData(auth, noTiquete);
      setTicketData(data);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        throw err;
      }
      setError('No se pudo cargar el tiquete para reimprimir.');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  return {
    open,
    ticketData,
    format,
    loading,
    error,
    openWithData,
    openForReprint,
    setFormat,
    close,
    print,
  };
}
