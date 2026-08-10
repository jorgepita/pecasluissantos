import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { buildCategoryTree, flattenCategoryTree } from '../buildCategoryTree';
import type { BrandRow, CategoryRow, ProductCondition } from '@/types/database';

const SEARCH_DEBOUNCE_MS = 400;

const CONDITION_OPTIONS: Array<{ value: ProductCondition; label: string }> = [
  { value: 'new', label: 'Novo' },
  { value: 'used', label: 'Usado' },
  { value: 'refurbished', label: 'Recondicionado' },
];

const selectClasses =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

interface ProductFiltersProps {
  categories: CategoryRow[];
  brands: BrandRow[];
  categorySlug: string;
  brandSlug: string;
  condition: ProductCondition | undefined;
  search: string;
  onCategoryChange: (slug: string) => void;
  onBrandChange: (slug: string) => void;
  onConditionChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

/** Simple, practical filters — one <select> per dimension plus a search
 * box. No faceted-search UI: the schema and catalogue size don't justify
 * it yet (see docs/ARCHITECTURE.md). */
export function ProductFilters({
  categories,
  brands,
  categorySlug,
  brandSlug,
  condition,
  search,
  onCategoryChange,
  onBrandChange,
  onConditionChange,
  onSearchChange,
}: ProductFiltersProps) {
  const flatCategories = flattenCategoryTree(buildCategoryTree(categories));

  // Debounced locally: typing shouldn't fire a Supabase query per
  // keystroke. `search` (the URL-backed value) stays in sync in both
  // directions — external changes (e.g. back/forward navigation) flow in,
  // local edits flow out after the user pauses.
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    if (localSearch === search) return;
    const timeout = setTimeout(() => onSearchChange(localSearch), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [localSearch, search, onSearchChange]);

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Input
        type="search"
        placeholder="Pesquisar por nome ou referência..."
        value={localSearch}
        onChange={(event) => setLocalSearch(event.target.value)}
        className="lg:col-span-2"
        aria-label="Pesquisar produtos"
      />

      <select
        value={categorySlug}
        onChange={(event) => onCategoryChange(event.target.value)}
        className={selectClasses}
        aria-label="Filtrar por categoria"
      >
        <option value="">Todas as categorias</option>
        {flatCategories.map(({ category, depth }) => (
          <option key={category.id} value={category.slug}>
            {'—'.repeat(depth)} {category.name}
          </option>
        ))}
      </select>

      <select
        value={brandSlug}
        onChange={(event) => onBrandChange(event.target.value)}
        className={selectClasses}
        aria-label="Filtrar por marca"
      >
        <option value="">Todas as marcas</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.slug}>
            {brand.name}
          </option>
        ))}
      </select>

      <select
        value={condition ?? ''}
        onChange={(event) => onConditionChange(event.target.value)}
        className={selectClasses}
        aria-label="Filtrar por estado"
      >
        <option value="">Todos os estados</option>
        {CONDITION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
