import { useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { useCategories } from '@/features/catalogue/useCategories';
import { useBrands } from '@/features/catalogue/useBrands';
import { useProductList } from '@/features/catalogue/useProductList';
import { ProductFilters } from '@/features/catalogue/components/ProductFilters';
import { ProductGrid } from '@/features/catalogue/components/ProductGrid';
import { useDocumentHead } from '@/hooks/useDocumentHead';
import type { PublicLayoutContext } from '@/layouts/PublicLayout';
import type { ProductCondition } from '@/types/database';

const CONDITION_VALUES: ProductCondition[] = ['new', 'used', 'refurbished'];

function isProductCondition(value: string): value is ProductCondition {
  return (CONDITION_VALUES as string[]).includes(value);
}

/** Public catalogue listing: search + filters, backed by URL query params
 * (?categoria=&marca=&condicao=&q=) so results are bookmarkable/shareable. */
export function CataloguePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categorySlug = searchParams.get('categoria') ?? '';
  const brandSlug = searchParams.get('marca') ?? '';
  const conditionParam = searchParams.get('condicao') ?? '';
  const condition = isProductCondition(conditionParam) ? conditionParam : undefined;
  const search = searchParams.get('q') ?? '';

  const { categories, loading: categoriesLoading } = useCategories();
  const { brands, loading: brandsLoading } = useBrands();
  const { storeConfig } = useOutletContext<PublicLayoutContext>();

  const categoryId = useMemo(
    () => (categorySlug ? categories.find((c) => c.slug === categorySlug)?.id : undefined),
    [categorySlug, categories],
  );

  const activeCategoryName = categorySlug
    ? categories.find((c) => c.slug === categorySlug)?.name
    : undefined;

  useDocumentHead({
    title: activeCategoryName
      ? `${activeCategoryName} | Catálogo | ${storeConfig.storeName}`
      : `Catálogo | ${storeConfig.storeName}`,
    description: activeCategoryName
      ? `Peças na categoria ${activeCategoryName} em ${storeConfig.storeName}.`
      : `Consulte o catálogo completo de peças automóveis de ${storeConfig.storeName}.`,
    url: `${window.location.origin}${import.meta.env.BASE_URL}produtos`,
  });
  const brandId = useMemo(
    () => (brandSlug ? brands.find((b) => b.slug === brandSlug)?.id : undefined),
    [brandSlug, brands],
  );

  // Categories/brands must be loaded first so a ?categoria=/?marca= slug in
  // the URL can be resolved to the numeric id the products query filters
  // on — otherwise the first fetch would run unfiltered, then re-run once
  // resolved, flashing unrelated results.
  const filtersReady = !categoriesLoading && !brandsLoading;

  const { items, loading, loadingMore, error, hasMore, loadMore } = useProductList({
    categoryId,
    brandId,
    condition,
    search: search || undefined,
    enabled: filtersReady,
  });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  return (
    <Container className="py-6 sm:py-10">
      <h1 className="text-xl sm:text-2xl">Catálogo</h1>

      <ProductFilters
        categories={categories}
        brands={brands}
        categorySlug={categorySlug}
        brandSlug={brandSlug}
        condition={condition}
        search={search}
        onCategoryChange={(value) => updateParam('categoria', value)}
        onBrandChange={(value) => updateParam('marca', value)}
        onConditionChange={(value) => updateParam('condicao', value)}
        onSearchChange={(value) => updateParam('q', value)}
      />

      {error ? (
        <p className="mt-8 text-sm text-danger-500">{error}</p>
      ) : (
        <ProductGrid
          items={items}
          loading={loading || !filtersReady}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      )}
    </Container>
  );
}
