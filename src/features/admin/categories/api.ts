import { supabase } from '@/lib/supabase';
import type { CategoryRow } from '@/types/database';

/**
 * Admin category queries/mutations. `listAllCategories` returns every
 * category regardless of `is_active` — RLS's `categories_select` policy
 * already grants that to `is_admin()`, this doesn't add its own filter
 * (same "don't duplicate what RLS guarantees" rule as features/catalogue).
 * Writes rely entirely on `categories_insert_admin` /
 * `categories_update_admin` — no client-side admin check substitutes for
 * them; a non-admin calling these functions gets an RLS error back.
 */

export async function listAllCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface CategoryInput {
  name: string;
  slug: string;
  description: string | null;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
}

export async function createCategory(input: CategoryInput): Promise<CategoryRow> {
  const { data, error } = await supabase.from('categories').insert(input).select('*').single();
  if (error) throw error;
  return data as CategoryRow;
}

export async function updateCategory(id: number, input: CategoryInput): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from('categories')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as CategoryRow;
}

/** Activate/deactivate — the everyday "remove from the public catalogue"
 * action for categories, and the only option while the category still has
 * dependents (see `deleteCategory` below). */
export async function setCategoryActive(id: number, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('categories').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export interface CategoryDeletionBlockers {
  productCount: number;
  childCategoryCount: number;
}

/** Counts what would block a permanent delete — products assigned directly
 * to this category, and subcategories whose `parent_id` points to it. Used
 * by `CategoriesPage` to decide, *before* offering the delete
 * confirmation, whether deletion is even possible, and to build the exact
 * "N produtos associados"/"N subcategorias associadas" message. This is a
 * courtesy check, not the safety mechanism — `deleteCategory` below still
 * relies on the database's own `on delete restrict` foreign keys
 * (`products.category_id`, `categories.parent_id`) in case a dependent row
 * is created between this check and the actual delete. */
export async function getCategoryDeletionBlockers(id: number): Promise<CategoryDeletionBlockers> {
  const [productsResult, childrenResult] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('category_id', id),
    supabase.from('categories').select('*', { count: 'exact', head: true }).eq('parent_id', id),
  ]);
  if (productsResult.error) throw productsResult.error;
  if (childrenResult.error) throw childrenResult.error;
  return {
    productCount: productsResult.count ?? 0,
    childCategoryCount: childrenResult.count ?? 0,
  };
}

/** Permanent delete. Only ever offered by the UI once
 * `getCategoryDeletionBlockers` reports zero dependents, but the actual
 * safety mechanism is unchanged: `on delete restrict` on
 * `products.category_id` and `categories.parent_id` (see
 * docs/DATABASE.md). A `23503` here means a dependent row appeared after
 * the check (a race, not the common case) — the caller maps that to a
 * friendly message via `pgErrorMessage` rather than trusting the earlier
 * check alone. No cascade, no automatic deletion of products or
 * subcategories — this simply removes the one `categories` row, and only
 * succeeds when nothing references it. */
export async function deleteCategory(id: number): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}
