import { useCallback, useEffect, useState } from 'react';
import type { ProductImageRow, ProductReferenceAliasRow, ProductRow } from '@/types/database';
import { getAdminProductById, listProductImages, listProductReferenceAliases } from './api';

interface UseAdminProductResult {
  /** undefined = still loading, null = not found */
  product: ProductRow | null | undefined;
  images: ProductImageRow[];
  aliases: ProductReferenceAliasRow[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Single product + its images + its reference aliases, for the edit page.
 * `id === undefined` (create mode) short-circuits to "nothing to load." */
export function useAdminProduct(id: number | undefined): UseAdminProductResult {
  const [product, setProduct] = useState<ProductRow | null | undefined>(undefined);
  const [images, setImages] = useState<ProductImageRow[]>([]);
  const [aliases, setAliases] = useState<ProductReferenceAliasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (id === undefined) {
      setProduct(undefined);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getAdminProductById(id), listProductImages(id), listProductReferenceAliases(id)])
      .then(([productRow, imageRows, aliasRows]) => {
        if (cancelled) return;
        setProduct(productRow);
        setImages(imageRows);
        setAliases(aliasRows);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar o produto.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { product, images, aliases, loading, error, reload };
}
