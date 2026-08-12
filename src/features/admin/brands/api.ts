import { supabase } from '@/lib/supabase';
import type { BrandRow } from '@/types/database';

/** Admin brand queries/mutations — same shape as features/admin/categories/api.ts. */

export async function listAllBrands(): Promise<BrandRow[]> {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface BrandInput {
  name: string;
  slug: string;
  is_active: boolean;
}

export async function createBrand(input: BrandInput): Promise<BrandRow> {
  const { data, error } = await supabase.from('brands').insert(input).select('*').single();
  if (error) throw error;
  return data as BrandRow;
}

export async function updateBrand(id: number, input: BrandInput): Promise<BrandRow> {
  const { data, error } = await supabase
    .from('brands')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as BrandRow;
}

export async function setBrandActive(id: number, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('brands').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export interface BrandDeletionBlockers {
  productCount: number;
}

/** Counts products referencing this brand — used by `BrandsPage` to decide,
 * before offering the delete confirmation, whether deletion is possible,
 * and to build the "N produtos associados" message. A courtesy check, not
 * the safety mechanism itself — see `deleteBrand` below, same reasoning as
 * `getCategoryDeletionBlockers` in features/admin/categories/api.ts. */
export async function getBrandDeletionBlockers(id: number): Promise<BrandDeletionBlockers> {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', id);
  if (error) throw error;
  return { productCount: count ?? 0 };
}

/** Permanent delete. Only ever offered once `getBrandDeletionBlockers`
 * reports zero dependent products, but the actual safety mechanism is
 * `products.brand_id`'s `on delete restrict` (see docs/DATABASE.md) — a
 * `23503` here (a product added between the check and this call) is
 * mapped to a friendly message by the caller via `pgErrorMessage`, not
 * trusted away. No cascade, no product side effects. */
export async function deleteBrand(id: number): Promise<void> {
  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) throw error;
}
