import { useCallback, useEffect, useState } from 'react';
import type { ProductCondition } from '@/types/database';
import { listProducts } from './api';
import type { ProductListItem } from './types';

interface UseProductListParams {
  categoryId?: number;
  brandId?: number;
  condition?: ProductCondition;
  search?: string;
  /** Set to false while filter inputs (e.g. category/brand slug -> id
   * resolution) aren't ready yet, to avoid an unfiltered fetch flashing
   * before the real filters apply. */
  enabled: boolean;
}

interface UseProductListResult {
  items: ProductListItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

/** Drives the /produtos listing: fetches page 0 whenever a filter changes,
 * and exposes `loadMore()` to append the next page (range()-based, not
 * full page-number pagination — see docs/ARCHITECTURE.md). */
export function useProductList({
  categoryId,
  brandId,
  condition,
  search,
  enabled,
}: UseProductListParams): UseProductListResult {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    listProducts({ categoryId, brandId, condition, search }, 0)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setHasMore(result.hasMore);
        setPage(0);
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
  }, [enabled, categoryId, brandId, condition, search]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);

    listProducts({ categoryId, brandId, condition, search }, nextPage)
      .then((result) => {
        setItems((prev) => [...prev, ...result.items]);
        setHasMore(result.hasMore);
        setPage(nextPage);
      })
      .catch(() => setError('Não foi possível carregar mais produtos.'))
      .finally(() => setLoadingMore(false));
  }, [page, hasMore, loadingMore, categoryId, brandId, condition, search]);

  return { items, loading, loadingMore, error, hasMore, loadMore };
}
