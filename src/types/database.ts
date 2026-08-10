/**
 * Hand-written types mirroring the current Supabase schema (see
 * supabase/migrations/). Kept minimal and updated by hand for now.
 *
 * Once the schema grows, consider generating this file with the Supabase
 * CLI (`supabase gen types typescript`) instead of maintaining it by hand —
 * not done yet because it would require a linked Supabase project, which
 * this foundation phase doesn't assume exists.
 */

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
    };
  };
}
