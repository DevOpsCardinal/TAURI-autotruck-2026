import { useCallback, useRef } from 'react';

export function useCatalogLoader<T>(
  loader: () => Promise<T[]>,
): () => Promise<T[]> {
  const cacheRef = useRef<T[] | null>(null);
  const loadingRef = useRef<Promise<T[]> | null>(null);

  return useCallback(async () => {
    if (cacheRef.current) return cacheRef.current;
    if (loadingRef.current) return loadingRef.current;

    loadingRef.current = loader()
      .then((data) => {
        cacheRef.current = data;
        loadingRef.current = null;
        return data;
      })
      .catch((error) => {
        loadingRef.current = null;
        throw error;
      });

    return loadingRef.current;
  }, [loader]);
}

export function clearCatalogCache(): void {
  // Reserved for session reset if needed
}
