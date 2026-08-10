import { useEffect, useState } from 'react';
import type { ProductStatus } from '@/types/database';
import { listAdminProducts, type AdminProductListItem } from './api';

interface UseAdminProductsParams {
  search?: string;
  status?: ProductStatus;
  categoryId?: number;
  brandId?: number;
}

interface UseAdminProductsResult {
  items: AdminProductListItem[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Individual scalar params (not one `filters` object) so the effect's
 * dependency array can list exactly what it uses — an object literal
 * passed fresh on every render would otherwise refetch every render
 * regardless of whether the values actually changed. Same pattern as
 * features/catalogue/useProductList.ts. */
export function useAdminProducts({
  search,
  status,
  categoryId,
  brandId,
}: UseAdminProductsParams): UseAdminProductsResult {
  const [items, setItems] = useState<AdminProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listAdminProducts({ search, status, categoryId, brandId })
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar os produtos.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, status, categoryId, brandId, reloadToken]);

  return { items, loading, error, reload: () => setReloadToken((token) => token + 1) };
}
