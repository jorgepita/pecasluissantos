/**
 * Store configuration shape used throughout the UI (header/footer contact
 * details, WhatsApp link, brand colours, etc). Kept separate from the raw
 * `StoreSettingsRow` DB type so the UI layer isn't coupled to column names.
 */
export interface StoreConfig {
  storeName: string;
  logoUrl: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  address: string | null;
  openingHours: Record<string, string> | null;
  socialMedia: Record<string, string> | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}
