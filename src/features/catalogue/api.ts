import { supabase } from '@/lib/supabase';
import type {
  BrandRow,
  CategoryRow,
  ProductImageRow,
  ProductReferenceAliasRow,
  ProductRow,
} from '@/types/database';
import type { ProductDetail, ProductFilters, ProductListItem } from './types';

/**
 * All Supabase calls for the public catalogue. Every query here relies on
 * the RLS policies from supabase/migrations (0004-0009) for what an
 * anonymous visitor can see — none of these add their own
 * `status = 'available'` / `is_active = true` predicate, on purpose. See
 * docs/DATABASE.md ("Public visibility"): the database already guarantees
 * it, so the query doesn't need to.
 *
 * `.select('*')` is used throughout (matching storeConfigService.ts)
 * rather than a narrower column list — our hand-written Database type
 * doesn't carry the extra relationship metadata Supabase's generated
 * types do, so `.select('col1, col2')` can't be reliably narrowed by the
 * compiler. A few unused columns coming back is a small, safe trade-off.
 */

const PRODUCT_IMAGE_BUCKET = 'product-images';
const PAGE_SIZE = 24;

/** Public URL for a Storage object. Synchronous — the bucket is public, so
 * this is just URL construction, not a network call. */
export function getPublicImageUrl(storagePath: string): string {
  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/** Mirrors the database's generated-column expression
 * (`upper(regexp_replace(reference, '[^0-9A-Za-z]', '', 'g'))`) so a
 * client-typed search term can be compared against
 * `primary_reference_normalized` / `reference_normalized`. Query-building
 * only — never stored. */
export function normalizeReference(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/**
 * PostgREST's `.or()` mini-language separates conditions with commas and
 * uses parentheses for value lists; a value containing those (or a literal
 * quote/backslash) must be double-quoted with backslash-escaping, or it
 * breaks the filter grammar. Only needed for the raw, arbitrary user
 * search text passed into `.or()` below — every other value used there
 * (normalized references, numeric ids) is already constrained to a safe
 * character set by construction.
 */
function escapeOrFilterValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export async function listCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listBrands(): Promise<BrandRow[]> {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function searchProductIdsByAliasReference(normalized: string): Promise<number[]> {
  if (!normalized) return [];
  const { data, error } = await supabase
    .from('product_reference_aliases')
    .select('*')
    .ilike('reference_normalized', `%${normalized}%`)
    .limit(200);
  if (error) throw error;
  // `.ilike()` combined with `.select('*')` loses row-type inference with
  // our hand-written (Relationships-less) Database type — cast to the
  // known shape rather than widen the whole client's typing to fix it.
  const rows = (data ?? []) as ProductReferenceAliasRow[];
  return [...new Set(rows.map((row) => row.product_id))];
}

/** Batch-fetches category names, brand names, and primary image paths for
 * a page of products and assembles `ProductListItem[]` — one round trip
 * per lookup (not one per product), so this stays O(1) queries per page
 * regardless of how many products are on it. */
async function attachListMetadata(rows: ProductRow[]): Promise<ProductListItem[]> {
  if (rows.length === 0) return [];

  const productIds = rows.map((row) => row.id);
  const categoryIds = [...new Set(rows.map((row) => row.category_id))];
  const brandIds = [
    ...new Set(rows.map((row) => row.brand_id).filter((id): id is number => id !== null)),
  ];

  const [categoriesResult, brandsResult, imagesResult] = await Promise.all([
    supabase.from('categories').select('*').in('id', categoryIds),
    brandIds.length > 0
      ? supabase.from('brands').select('*').in('id', brandIds)
      : Promise.resolve({ data: [] as BrandRow[], error: null }),
    supabase.from('product_images').select('*').in('product_id', productIds),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (brandsResult.error) throw brandsResult.error;
  if (imagesResult.error) throw imagesResult.error;

  // `.in()` combined with `.select('*')` loses row-type inference with our
  // hand-written (Relationships-less) Database type, same as `.ilike()`
  // above — cast to the known shape rather than widen the client's typing.
  const categoryRows = (categoriesResult.data ?? []) as CategoryRow[];
  const brandRows = (brandsResult.data ?? []) as BrandRow[];
  const imageRows = (imagesResult.data ?? []) as ProductImageRow[];

  const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));
  const brandNameById = new Map(brandRows.map((b) => [b.id, b.name]));

  const sortedImages = [...imageRows].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
  const primaryImageByProduct = new Map<number, string>();
  for (const image of sortedImages) {
    if (!primaryImageByProduct.has(image.product_id)) {
      primaryImageByProduct.set(image.product_id, image.storage_path);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    // A product's category can, in principle, be a category the current
    // request can no longer see (deactivated after the product was
    // published) — fall back to an empty label rather than crash.
    categoryName: categoryNameById.get(row.category_id) ?? '',
    brandName: row.brand_id !== null ? (brandNameById.get(row.brand_id) ?? null) : null,
    primaryReference: row.primary_reference,
    condition: row.condition,
    price: row.price,
    currency: row.currency,
    stockQuantity: row.stock_quantity,
    primaryImagePath: primaryImageByProduct.get(row.id) ?? null,
  }));
}

export interface ListProductsResult {
  items: ProductListItem[];
  hasMore: boolean;
}

/** `page` is 0-based. Results are appended by the caller for "load more"
 * rather than this function managing pagination state itself. */
export async function listProducts(
  filters: ProductFilters,
  page: number,
): Promise<ListProductsResult> {
  let query = supabase.from('products').select('*').order('created_at', { ascending: false });

  if (filters.categoryId !== undefined) query = query.eq('category_id', filters.categoryId);
  if (filters.brandId !== undefined) query = query.eq('brand_id', filters.brandId);
  if (filters.condition) query = query.eq('condition', filters.condition);

  const search = filters.search?.trim();
  if (search) {
    const normalized = normalizeReference(search);
    const orConditions = [`name.ilike.${escapeOrFilterValue(`%${search}%`)}`];

    if (normalized) {
      orConditions.push(`primary_reference_normalized.ilike.%${normalized}%`);
      const aliasProductIds = await searchProductIdsByAliasReference(normalized);
      if (aliasProductIds.length > 0) {
        orConditions.push(`id.in.(${aliasProductIds.join(',')})`);
      }
    }

    query = query.or(orConditions.join(','));
  }

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error } = await query.range(from, to);
  if (error) throw error;

  const rows = data ?? [];
  const items = await attachListMetadata(rows);
  return { items, hasMore: rows.length === PAGE_SIZE };
}

export async function getProductBySlug(slug: string): Promise<ProductRow | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProductImages(productId: number): Promise<ProductImageRow[]> {
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getProductReferenceAliases(
  productId: number,
): Promise<ProductReferenceAliasRow[]> {
  const { data, error } = await supabase
    .from('product_reference_aliases')
    .select('*')
    .eq('product_id', productId)
    .order('reference_type', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function getCategoryById(id: number): Promise<CategoryRow | null> {
  const { data, error } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function getBrandById(id: number): Promise<BrandRow | null> {
  const { data, error } = await supabase.from('brands').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Assembles the full /produtos/:slug view. Returns `null` if the slug
 * doesn't resolve to a row the current (anonymous) request can see — RLS
 * returns nothing for both "doesn't exist" and "exists but not
 * available", indistinguishably, which is the point (see
 * docs/DATABASE.md "Public visibility"). */
export async function getProductDetail(slug: string): Promise<ProductDetail | null> {
  const row = await getProductBySlug(slug);
  if (!row) return null;

  const [category, brand, images, referenceAliases] = await Promise.all([
    getCategoryById(row.category_id),
    row.brand_id !== null ? getBrandById(row.brand_id) : Promise.resolve(null),
    getProductImages(row.id),
    getProductReferenceAliases(row.id),
  ]);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    category: category ? { name: category.name, slug: category.slug } : null,
    brand: brand ? { name: brand.name, slug: brand.slug } : null,
    primaryReference: row.primary_reference,
    condition: row.condition,
    price: row.price,
    currency: row.currency,
    stockQuantity: row.stock_quantity,
    compatibilityNotes: row.compatibility_notes,
    images,
    referenceAliases,
  };
}
