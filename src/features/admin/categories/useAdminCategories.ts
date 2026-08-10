import { useCallback, useEffect, useState } from 'react';
import type { CategoryRow } from '@/types/database';
import { listAllCategories } from './api';

interface UseAdminCategoriesResult {
  categories: CategoryRow[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAdminCategories(): UseAdminCategoriesResult {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listAllCategories()
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
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { categories, loading, error, reload };
}
