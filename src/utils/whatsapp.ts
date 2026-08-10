/**
 * Shared helpers for turning a `store_settings.whatsapp_number`/`phone`
 * value (entered by an admin in whatever format they typed it — spaces,
 * `+351`, parentheses, hyphens) into a working `wa.me`/`tel:` link.
 *
 * Used by both `PublicLayout` (footer contact info) and
 * `ProductContactActions` (product-page contact CTA) — one implementation,
 * not duplicated per call site.
 */

/** wa.me expects digits only (country code + number) — no `+`, spaces,
 * parentheses or hyphens. Stripping everything non-digit handles all of
 * those uniformly, since none of them are meaningful to the destination. */
export function normalizeWhatsAppNumber(rawNumber: string): string {
  return rawNumber.replace(/[^0-9]/g, '');
}

/** Builds a `https://wa.me/<number>` link, optionally with a pre-filled
 * message. The message is URL-encoded, so newlines and accented PT-PT
 * characters come through correctly. */
export function buildWhatsAppUrl(rawNumber: string, message?: string): string {
  const digits = normalizeWhatsAppNumber(rawNumber);
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** `tel:` links accept a leading `+`; only strip separators, not the
 * country-code marker. */
export function buildTelUrl(rawNumber: string): string {
  return `tel:${rawNumber.replace(/[^0-9+]/g, '')}`;
}
