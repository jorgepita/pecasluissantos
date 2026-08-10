import { Button } from '@/components/ui/Button';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import type { ProductListItem } from '../types';

interface ProductGridProps {
  items: ProductListItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

const SKELETON_COUNT = 8;

export function ProductGrid({
  items,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-slate-500">
        Nenhum produto encontrado com estes critérios.
      </p>
    );
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button variant="ghost" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'A carregar...' : 'Carregar mais'}
          </Button>
        </div>
      )}
    </>
  );
}
