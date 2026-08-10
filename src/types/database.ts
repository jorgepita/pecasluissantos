/**
 * Hand-written types mirroring the current Supabase schema (see
 * supabase/migrations/). Kept minimal and updated by hand for now.
 *
 * Once the schema grows further, consider generating this file with the
 * Supabase CLI (`supabase gen types typescript`) instead of maintaining it
 * by hand — not done yet because it requires a linked Supabase project
 * (access token + project ref), which isn't configured in every
 * environment this repo is worked from. Revisit once that's set up.
 *
 * Two non-obvious things below are load-bearing, not stylistic:
 *
 * 1. Row shapes are declared with `type X = {...}`, not `interface X {...}`.
 *    `@supabase/postgrest-js`'s `.insert()`/`.update()` require each row
 *    type to structurally satisfy `Record<string, unknown>`. A `type`
 *    alias for an object shape does; a declared `interface` with the same
 *    members does not (TypeScript only grants object *type* shapes an
 *    implicit index signature for this check, not `interface` declarations)
 *    — using `interface` here silently collapsed `.insert()`/`.update()`'s
 *    row-type parameter to `never` for every table. `.select()` doesn't
 *    hit this path, which is why it went unnoticed until Phase 2's admin
 *    write code needed `.insert()`/`.update()`. Confirmed directly with an
 *    isolated `tsc` repro against the installed postgrest-js source, not
 *    guessed — don't revert this to `interface`.
 * 2. `Relationships: []` per table and `Views`/`Functions` on the schema
 *    are required by postgrest-js's `GenericTable`/`GenericSchema`
 *    constraint types, even though this project has no views/functions —
 *    also confirmed against the installed source.
 */

// ---------------------------------------------------------------------------
// store_settings / admin_users (0001, 0002)
// ---------------------------------------------------------------------------

export type StoreSettingsRow = {
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
};

export type AdminUserRow = {
  id: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Product catalogue (0004-0008) — see docs/DATABASE.md for the full schema.
// ---------------------------------------------------------------------------

export type ProductCondition = 'new' | 'used' | 'refurbished';
export type ProductStatus = 'draft' | 'available' | 'reserved' | 'sold' | 'unavailable';
export type ProductReferenceType = 'oem' | 'manufacturer' | 'equivalent' | 'other';

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BrandRow = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
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
};

export type ProductImageRow = {
  id: number;
  product_id: number;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};

export type ProductReferenceAliasRow = {
  id: number;
  product_id: number;
  reference: string;
  /** Generated column (upper-cased, non-alphanumerics stripped). Read-only. */
  reference_normalized: string;
  reference_type: ProductReferenceType;
  created_at: string;
};

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
        Relationships: [];
      };
      admin_users: {
        Row: AdminUserRow;
        Insert: { id: string };
        Update: never;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: Partial<CategoryRow> & { name: string; slug: string };
        Update: Partial<CategoryRow>;
        Relationships: [];
      };
      brands: {
        Row: BrandRow;
        Insert: Partial<BrandRow> & { name: string; slug: string };
        Update: Partial<BrandRow>;
        Relationships: [];
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
        Relationships: [];
      };
      product_images: {
        Row: ProductImageRow;
        Insert: Partial<ProductImageRow> & { product_id: number; storage_path: string };
        Update: Partial<ProductImageRow>;
        Relationships: [];
      };
      product_reference_aliases: {
        Row: ProductReferenceAliasRow;
        Insert: Partial<Omit<ProductReferenceAliasRow, 'reference_normalized'>> & {
          product_id: number;
          reference: string;
        };
        Update: Partial<Omit<ProductReferenceAliasRow, 'reference_normalized'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
