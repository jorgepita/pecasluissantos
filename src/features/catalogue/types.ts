import type {
  CategoryRow,
  ProductCondition,
  ProductReferenceAliasRow,
  ProductImageRow,
} from '@/types/database';

/**
 * View/query types for the catalogue UI. Kept separate from
 * `src/types/database.ts` (raw table rows) because these are derived —
 * joined across tables client-side, or reshaped for how components use
 * them — not a second, competing description of the schema.
 */

export interface CategoryNode extends CategoryRow {
  children: CategoryNode[];
}

export interface ProductFilters {
  categoryId?: number;
  brandId?: number;
  condition?: ProductCondition;
  /** Raw user search text (not pre-normalized — see features/catalogue/api.ts). */
  search?: string;
}

/** Row shown on the /produtos listing grid — assembled from products + a
 * small batch of lookup queries (category name, brand name, primary image). */
export interface ProductListItem {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  categoryName: string;
  brandName: string | null;
  primaryReference: string;
  condition: ProductCondition;
  price: string;
  currency: string;
  stockQuantity: number;
  primaryImagePath: string | null;
  /** Set only when this item matched an active search *via an alternative
   * reference* (`product_reference_aliases`), not its own
   * `primaryReference` — lets `ProductCard` explain the match to the
   * customer. `null` for every item outside of a search, so normal
   * browsing is unaffected. See `listProducts` in `api.ts`. */
  matchedAlternativeReference: string | null;
}

/** Full detail shown on /produtos/:slug. `category`/`brand` can be null —
 * e.g. a product's category was later deactivated, so RLS no longer
 * returns it to an anonymous request even though the product itself
 * (status='available') is still visible. The UI must tolerate that. */
export interface ProductDetail {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  category: { name: string; slug: string } | null;
  brand: { name: string; slug: string } | null;
  primaryReference: string;
  condition: ProductCondition;
  price: string;
  currency: string;
  stockQuantity: number;
  compatibilityNotes: string | null;
  images: ProductImageRow[];
  referenceAliases: ProductReferenceAliasRow[];
}
