import { useEffect, useState } from 'react';
import type { CategoryRow } from '@/types/database';
import { listCategories } from './api';

interface UseCategoriesResult {
  categories: CategoryRow[];
  loading: boolean;
  error: string | null;
}

/** Active categories visible to the current (anonymous) request, per RLS. */
export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar as categorias.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading, error };
}
