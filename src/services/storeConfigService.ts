import { supabase } from '@/lib/supabase';
import type { StoreConfig } from '@/types/store-config';
import type { StoreSettingsRow } from '@/types/database';

/**
 * Fallback used until a `store_settings` row exists (fresh install) or
 * while the real value is loading. This is NOT the source of truth for
 * store branding — it exists only so the UI has something sane to render
 * before/without live data. See docs/ARCHITECTURE.md ("Configuration
 * strategy") — the repository/app name is not the store's public brand.
 */
export const DEFAULT_STORE_CONFIG: StoreConfig = {
  storeName: 'Peças Luís Santos',
  logoUrl: null,
  phone: null,
  whatsappNumber: null,
  email: null,
  address: null,
  openingHours: null,
  socialMedia: null,
  primaryColor: null,
  secondaryColor: null,
};

function mapRow(row: StoreSettingsRow): StoreConfig {
  return {
    storeName: row.store_name,
    logoUrl: row.logo_url,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    email: row.email,
    address: row.address,
    openingHours: row.opening_hours,
    socialMedia: row.social_media,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
  };
}

/**
 * Reads the single `store_settings` row. Returns `DEFAULT_STORE_CONFIG` if
 * no row exists yet or the request fails, so the public site always has
 * something to render. Called from `PublicLayout` on every page load
 * (Phase 1B) and from the admin settings form (Phase 2, to prefill it).
 */
export async function getStoreConfig(): Promise<StoreConfig> {
  const { data, error } = await supabase.from('store_settings').select('*').limit(1).maybeSingle();

  if (error || !data) {
    return DEFAULT_STORE_CONFIG;
  }

  return mapRow(data);
}

/**
 * Creates or updates the single `store_settings` row. `upsert` (rather
 * than a plain `update`) because the row may not exist yet the first time
 * an admin fills in the settings form — same table, same `StoreConfig`
 * shape as `getStoreConfig()`, not a second model. Admin-only per RLS
 * (`store_settings_insert_admin` / `store_settings_update_admin`); a
 * non-admin calling this gets the RLS error back unchanged, there is no
 * client-side admin check here to bypass.
 */
export async function saveStoreConfig(input: StoreConfig): Promise<StoreConfig> {
  const { data, error } = await supabase
    .from('store_settings')
    .upsert({
      id: 1,
      store_name: input.storeName,
      logo_url: input.logoUrl,
      phone: input.phone,
      whatsapp_number: input.whatsappNumber,
      email: input.email,
      address: input.address,
      opening_hours: input.openingHours,
      social_media: input.socialMedia,
      primary_color: input.primaryColor,
      secondary_color: input.secondaryColor,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapRow(data as StoreSettingsRow);
}
