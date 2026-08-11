import { supabase } from '@/lib/supabase';
import type {
  BrandRow,
  CategoryRow,
  ProductCondition,
  ProductImageRow,
  ProductReferenceAliasRow,
  ProductReferenceType,
  ProductRow,
  ProductStatus,
} from '@/types/database';

/**
 * Admin product queries/mutations, plus the `product_images` and
 * `product_reference_aliases` CRUD needed to manage a product's photos
 * and alternative references — the *existing* models from Phase 1A, not a
 * second one. RLS (`products_*_admin`, `product_images_*_admin`,
 * `product_reference_aliases_*_admin`) is the only enforcement for
 * writes; nothing here re-implements an admin check client-side.
 */

const PRODUCT_LIST_LIMIT = 500;

function escapeOrFilterValue(value: string): string {
  // Same PostgREST `.or()` quoting rule as features/catalogue/api.ts.
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export interface AdminProductFilters {
  search?: string;
  status?: ProductStatus;
  categoryId?: number;
  brandId?: number;
}

export interface AdminProductListItem {
  id: number;
  name: string;
  slug: string;
  primaryReference: string;
  categoryName: string;
  brandName: string | null;
  price: string;
  currency: string;
  condition: ProductCondition;
  status: ProductStatus;
  stockQuantity: number;
}

async function attachAdminListMetadata(rows: ProductRow[]): Promise<AdminProductListItem[]> {
  if (rows.length === 0) return [];

  const categoryIds = [...new Set(rows.map((row) => row.category_id))];
  const brandIds = [
    ...new Set(rows.map((row) => row.brand_id).filter((id): id is number => id !== null)),
  ];

  const [categoriesResult, brandsResult] = await Promise.all([
    supabase.from('categories').select('*').in('id', categoryIds),
    brandIds.length > 0
      ? supabase.from('brands').select('*').in('id', brandIds)
      : Promise.resolve({ data: [] as BrandRow[], error: null }),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (brandsResult.error) throw brandsResult.error;

  const categoryRows = (categoriesResult.data ?? []) as CategoryRow[];
  const brandRows = (brandsResult.data ?? []) as BrandRow[];
  const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));
  const brandNameById = new Map(brandRows.map((b) => [b.id, b.name]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    primaryReference: row.primary_reference,
    categoryName: categoryNameById.get(row.category_id) ?? '',
    brandName: row.brand_id !== null ? (brandNameById.get(row.brand_id) ?? null) : null,
    price: row.price,
    currency: row.currency,
    condition: row.condition,
    status: row.status,
    stockQuantity: row.stock_quantity,
  }));
}

/** Admin sees every product regardless of status — RLS's `products_select`
 * policy already grants that to `is_admin()`. Capped at
 * `PRODUCT_LIST_LIMIT` rather than "load more" pagination: simpler, and
 * fine for a catalogue this size (see docs/ARCHITECTURE.md). */
export async function listAdminProducts(
  filters: AdminProductFilters,
): Promise<AdminProductListItem[]> {
  let query = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(PRODUCT_LIST_LIMIT);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.categoryId !== undefined) query = query.eq('category_id', filters.categoryId);
  if (filters.brandId !== undefined) query = query.eq('brand_id', filters.brandId);

  const search = filters.search?.trim();
  if (search) {
    const escaped = escapeOrFilterValue(`%${search}%`);
    query = query.or(`name.ilike.${escaped},primary_reference.ilike.${escaped}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return attachAdminListMetadata((data ?? []) as ProductRow[]);
}

export async function getAdminProductById(id: number): Promise<ProductRow | null> {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export interface ProductInput {
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  category_id: number;
  brand_id: number | null;
  primary_reference: string;
  condition: ProductCondition;
  price: string;
  currency: string;
  stock_quantity: number;
  status: ProductStatus;
  compatibility_notes: string | null;
}

/** Fields carried over by the "Duplicar" action on `ProductsPage` into a
 * fresh `/admin/produtos/novo` form (via router `state`). Deliberately
 * excludes `slug` and `primary_reference` (both unique-constrained —
 * copying them verbatim would just collide, see docs/DATABASE.md) and
 * `status`/`stock_quantity` (a duplicate must start as an unpublished,
 * zero-stock draft, never inherit the source product's live
 * availability) — `ProductForm`'s normal create-mode defaults cover all
 * four. Images and reference aliases are never copied either; those stay
 * per-product by design (see docs/ARCHITECTURE.md "Admin CRUD"). */
export type ProductDuplicateSeed = Pick<
  ProductInput,
  | 'name'
  | 'short_description'
  | 'description'
  | 'category_id'
  | 'brand_id'
  | 'condition'
  | 'price'
  | 'currency'
  | 'compatibility_notes'
>;

export async function createProduct(input: ProductInput): Promise<ProductRow> {
  const { data, error } = await supabase.from('products').insert(input).select('*').single();
  if (error) throw error;
  return data as ProductRow;
}

export async function updateProduct(id: number, input: ProductInput): Promise<ProductRow> {
  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as ProductRow;
}

/** Single-field status update for the `ProductsPage` list's quick publish/
 * unpublish action — a partial `.update()`, not the full `ProductInput`
 * `updateProduct` above requires, so the list doesn't need to fetch (and
 * resubmit) every other field just to flip visibility. Same table, same
 * RLS (`is_admin()`-gated), no new model. */
export async function updateProductStatus(id: number, status: ProductStatus): Promise<void> {
  const { error } = await supabase.from('products').update({ status }).eq('id', id);
  if (error) throw error;
}

/** Real delete (unlike categories/brands) — cascades `product_images` and
 * `product_reference_aliases` rows by design (see docs/DATABASE.md). Does
 * NOT delete the images' underlying Storage objects (same documented
 * "known gap" as deleteProductImage below). */
export async function deleteProduct(id: number): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

const PRODUCT_IMAGE_BUCKET = 'product-images';
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // matches the bucket's file_size_limit
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

export async function listProductImages(productId: number): Promise<ProductImageRow[]> {
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Uploads to Storage, then records the row. Path is
 * `products/<product_id>/<uuid>.<ext>` — a random id, not the user's
 * filename, so there's nothing to sanitize and no collision risk. The
 * first image on a product becomes primary automatically. */
export async function uploadProductImage(productId: number, file: File): Promise<ProductImageRow> {
  const path = `products/${productId}/${crypto.randomUUID()}.${extensionForMimeType(file.type)}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const existing = await listProductImages(productId);
  const nextSortOrder =
    existing.length > 0 ? Math.max(...existing.map((image) => image.sort_order)) + 1 : 0;

  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      storage_path: path,
      sort_order: nextSortOrder,
      is_primary: existing.length === 0,
    })
    .select('*')
    .single();

  if (error) {
    // The object made it into Storage but the row didn't — best-effort
    // cleanup so a failed upload doesn't leave an orphan right away.
    await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove([path])
      .catch(() => undefined);
    throw error;
  }

  return data as ProductImageRow;
}

/** DB row first, then best-effort Storage cleanup — if the row delete
 * fails, nothing is lost; if the Storage delete fails after, the object
 * becomes an orphan (the same already-documented limitation, not a new
 * one introduced here). */
export async function deleteProductImage(image: ProductImageRow): Promise<void> {
  const { error } = await supabase.from('product_images').delete().eq('id', image.id);
  if (error) throw error;

  await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .remove([image.storage_path])
    .catch(() => undefined);
}

/** Unsets the previous primary (if any) before setting the new one —
 * strictly sequential, so the partial unique index
 * (`product_images_one_primary_per_product`) never sees two `true` rows
 * for the same product at once. */
export async function setPrimaryProductImage(productId: number, imageId: number): Promise<void> {
  const images = await listProductImages(productId);
  const currentPrimary = images.find((image) => image.is_primary && image.id !== imageId);

  if (currentPrimary) {
    const { error } = await supabase
      .from('product_images')
      .update({ is_primary: false })
      .eq('id', currentPrimary.id);
    if (error) throw error;
  }

  const { error } = await supabase
    .from('product_images')
    .update({ is_primary: true })
    .eq('id', imageId);
  if (error) throw error;
}

/** Swaps `sort_order` with the adjacent image — simple, dependency-free
 * reordering (no drag-and-drop library). */
export async function reorderProductImage(
  image: ProductImageRow,
  direction: 'up' | 'down',
  allImages: ProductImageRow[],
): Promise<void> {
  const sorted = [...allImages].sort((a, b) => a.sort_order - b.sort_order);
  const index = sorted.findIndex((item) => item.id === image.id);
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= sorted.length) return;

  const swapWith = sorted[swapIndex];

  const { error: firstError } = await supabase
    .from('product_images')
    .update({ sort_order: swapWith.sort_order })
    .eq('id', image.id);
  if (firstError) throw firstError;

  const { error: secondError } = await supabase
    .from('product_images')
    .update({ sort_order: image.sort_order })
    .eq('id', swapWith.id);
  if (secondError) throw secondError;
}

// ---------------------------------------------------------------------------
// Reference aliases
// ---------------------------------------------------------------------------

export async function listProductReferenceAliases(
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

export interface ReferenceAliasInput {
  reference: string;
  reference_type: ProductReferenceType;
}

export async function addProductReferenceAlias(
  productId: number,
  input: ReferenceAliasInput,
): Promise<ProductReferenceAliasRow> {
  const { data, error } = await supabase
    .from('product_reference_aliases')
    .insert({
      product_id: productId,
      reference: input.reference,
      reference_type: input.reference_type,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ProductReferenceAliasRow;
}

export async function deleteProductReferenceAlias(id: number): Promise<void> {
  const { error } = await supabase.from('product_reference_aliases').delete().eq('id', id);
  if (error) throw error;
}
