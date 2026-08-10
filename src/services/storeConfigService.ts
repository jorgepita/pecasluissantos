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
 * something to render.
 *
 * Not yet called from the UI in this foundation phase — the shell renders
 * `DEFAULT_STORE_CONFIG` directly. Wiring this up is next-phase work (see
 * docs/ROADMAP.md) once the admin settings screen exists to populate the row.
 */
export async function getStoreConfig(): Promise<StoreConfig> {
  const { data, error } = await supabase.from('store_settings').select('*').limit(1).maybeSingle();

  if (error || !data) {
    return DEFAULT_STORE_CONFIG;
  }

  return mapRow(data);
}
