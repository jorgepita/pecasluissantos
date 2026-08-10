import { useEffect, useState } from 'react';
import { getProductDetail } from './api';
import type { ProductDetail } from './types';

interface UseProductDetailResult {
  /** undefined = still loading, null = not found (or not publicly visible — see api.ts). */
  product: ProductDetail | null | undefined;
  error: string | null;
}

export function useProductDetail(slug: string): UseProductDetailResult {
  const [product, setProduct] = useState<ProductDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProduct(undefined);
    setError(null);

    getProductDetail(slug)
      .then((result) => {
        if (!cancelled) setProduct(result);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar o produto.');
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { product, error };
}
