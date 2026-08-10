import { useCallback, useEffect, useState } from 'react';
import type { BrandRow } from '@/types/database';
import { listAllBrands } from './api';

interface UseAdminBrandsResult {
  brands: BrandRow[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAdminBrands(): UseAdminBrandsResult {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listAllBrands()
      .then((data) => {
        if (!cancelled) setBrands(data);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar as marcas.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { brands, loading, error, reload };
}
