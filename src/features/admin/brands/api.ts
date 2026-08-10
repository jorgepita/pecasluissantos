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
