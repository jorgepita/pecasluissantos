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

/** Activate/deactivate — the supported "remove from the public catalogue"
 * action for categories. No hard delete: `on delete restrict` means a
 * category with subcategories or products would just fail with a
 * confusing FK error; deactivating is the intended mechanism (see
 * docs/DATABASE.md). */
export async function setCategoryActive(id: number, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('categories').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}
