import { useEffect, useState } from 'react';
import type { BrandRow } from '@/types/database';
import { listBrands } from './api';

interface UseBrandsResult {
  brands: BrandRow[];
  loading: boolean;
  error: string | null;
}

/** Active brands visible to the current (anonymous) request, per RLS. */
export function useBrands(): UseBrandsResult {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listBrands()
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
  }, []);

  return { brands, loading, error };
}
