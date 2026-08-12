/**
 * Builds a Google Maps search URL from the store's free-text address
 * (`store_settings.address`) — no Maps API key, no place ID, no map
 * provider abstraction, just a plain external search link. Used by
 * `PublicLayout`'s footer "Ver localização no mapa" action.
 *
 * The `/maps/search/?api=1&query=` form (Google's documented URL-based
 * Maps Search API) works with a free-text address, unlike a `/maps/place/`
 * link which expects a resolved place. Collapsing whitespace first (a
 * multi-line address becomes one line) keeps the query readable and
 * avoids embedding a raw newline; `encodeURIComponent` then handles
 * spaces, accents, and punctuation (e.g. PT-PT characters, commas) safely.
 */
export function buildMapUrl(address: string): string {
  const query = address.replace(/\s+/g, ' ').trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
