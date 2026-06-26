import { useCallback, useEffect, useState } from 'react';
import { getTransitByPlaca, searchTransitVehicles } from '../api/transit.api';
import { ApiAuth, TransitRecord } from '../types/operation.types';

interface TransitSearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: TransitRecord[];
  isLoading: boolean;
  selectedRecord: TransitRecord | null;
  selectRecord: (record: TransitRecord) => Promise<void>;
  clearRecord: () => void;
  allRecords: TransitRecord[];
  loadAllRecords: () => Promise<void>;
  isLoadingAll: boolean;
}

export function useTransitSearch(auth: ApiAuth | null): TransitSearchResult {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<TransitRecord[]>([]);
  const [allRecords, setAllRecords] = useState<TransitRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TransitRecord | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!auth?.token) return;
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    searchTransitVehicles(auth, { search: debouncedQuery, limit: 10 })
      .then((response) => {
        if (!cancelled) setResults(response.data);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth?.token, debouncedQuery]);

  const loadAllRecords = useCallback(async () => {
    if (!auth?.token) return;
    setIsLoadingAll(true);
    try {
      const response = await searchTransitVehicles(auth, { limit: 100 });
      setAllRecords(response.data);
    } catch {
      setAllRecords([]);
    } finally {
      setIsLoadingAll(false);
    }
  }, [auth?.token]);

  const selectRecord = useCallback(
    async (record: TransitRecord) => {
      if (!auth?.token) {
        setSelectedRecord(record);
        return;
      }
      try {
        const fresh = await getTransitByPlaca(auth, record.placa);
        setSelectedRecord(fresh);
      } catch {
        setSelectedRecord(null);
        throw new Error('VEHICLE_NOT_IN_TRANSIT');
      }
    },
    [auth],
  );

  const clearRecord = useCallback(() => {
    setSelectedRecord(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    selectedRecord,
    selectRecord,
    clearRecord,
    allRecords,
    loadAllRecords,
    isLoadingAll,
  };
}
