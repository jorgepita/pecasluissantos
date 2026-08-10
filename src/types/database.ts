/**
 * Hand-written types mirroring the current Supabase schema (see
 * supabase/migrations/). Kept minimal and updated by hand for now.
 *
 * Once the schema grows further, consider generating this file with the
 * Supabase CLI (`supabase gen types typescript`) instead of maintaining it
 * by hand — not done yet because it requires a linked Supabase project
 * (access token + project ref), which isn't configured in every
 * environment this repo is worked from. Revisit once that's set up.
 */

// ---------------------------------------------------------------------------
// store_settings / admin_users (0001, 0002)
// ---------------------------------------------------------------------------

export interface StoreSettingsRow {
  id: number;
  store_name: string;
  logo_url: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  address: string | null;
  opening_hours: Record<string, string> | null;
  social_media: Record<string, string> | null;
  primary_color: string | null;
  secondary_color: string | null;
  updated_at: string;
}

export interface AdminUserRow {
  id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Product catalogue (0004-0008) — see docs/DATABASE.md for the full schema.
// ---------------------------------------------------------------------------

export type ProductCondition = 'new' | 'used' | 'refurbished';
export type ProductStatus = 'draft' | 'available' | 'reserved' | 'sold' | 'unavailable';
export type ProductReferenceType = 'oem' | 'manufacturer' | 'equivalent' | 'other';

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandRow {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: number;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  category_id: number;
  brand_id: number | null;
  primary_reference: string;
  /** Generated column (upper-cased, non-alphanumerics stripped). Read-only. */
  primary_reference_normalized: string;
  condition: ProductCondition;
  /**
   * PostgREST returns `numeric` columns as strings, not numbers, to avoid
   * silent float precision loss — parse with a decimal-safe approach when
   * doing arithmetic, don't just `Number(price)` and treat it as exact.
   */
  price: string;
  currency: string;
  stock_quantity: number;
  status: ProductStatus;
  /** Free-text only — NOT structured vehicle compatibility. See docs/DATABASE.md. */
  compatibility_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImageRow {
  id: number;
  product_id: number;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductReferenceAliasRow {
  id: number;
  product_id: number;
  reference: string;
  /** Generated column (upper-cased, non-alphanumerics stripped). Read-only. */
  reference_normalized: string;
  reference_type: ProductReferenceType;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      store_settings: {
        Row: StoreSettingsRow;
        Insert: Partial<StoreSettingsRow> & { store_name: string };
        Update: Partial<StoreSettingsRow>;
      };
      admin_users: {
        Row: AdminUserRow;
        Insert: { id: string };
        Update: never;
      };
      categories: {
        Row: CategoryRow;
        Insert: Partial<CategoryRow> & { name: string; slug: string };
        Update: Partial<CategoryRow>;
      };
      brands: {
        Row: BrandRow;
        Insert: Partial<BrandRow> & { name: string; slug: string };
        Update: Partial<BrandRow>;
      };
      products: {
        Row: ProductRow;
        Insert: Partial<Omit<ProductRow, 'primary_reference_normalized'>> & {
          name: string;
          slug: string;
          category_id: number;
          primary_reference: string;
          price: string;
        };
        Update: Partial<Omit<ProductRow, 'primary_reference_normalized'>>;
      };
      product_images: {
        Row: ProductImageRow;
        Insert: Partial<ProductImageRow> & { product_id: number; storage_path: string };
        Update: Partial<ProductImageRow>;
      };
      product_reference_aliases: {
        Row: ProductReferenceAliasRow;
        Insert: Partial<Omit<ProductReferenceAliasRow, 'reference_normalized'>> & {
          product_id: number;
          reference: string;
        };
        Update: Partial<Omit<ProductReferenceAliasRow, 'reference_normalized'>>;
      };
    };
  };
}
