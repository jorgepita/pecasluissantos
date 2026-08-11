import { useEffect } from 'react';

/**
 * The first hook that isn't feature-specific — used by every page under
 * `PublicLayout` (`pages/public/*`), not owned by one `features/` slice.
 * See docs/PROJECT_MAP.md ("Deviations..."): this is the exact trigger
 * that doc names for adding a top-level `hooks/` directory.
 */

interface DocumentHeadInput {
  /** Full `document.title` — callers compose the "{page} | {storeName}"
   * pattern themselves (see pages/public/*), this hook doesn't assume it. */
  title: string;
  description: string;
  /** Absolute canonical URL for `og:url` (see `buildProductUrl` in
   * features/catalogue/format.ts for the base-path-correct builder). */
  url?: string;
  /** Absolute `og:image` URL. Omitted (not just falsy) when the page has
   * no photo, so a previous page's image doesn't linger. */
  image?: string;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

/**
 * Sets `document.title` and the description/Open Graph `<meta>` tags for
 * the current page.
 *
 * **Known limitation, by design**: this app is a pure client-rendered SPA
 * (no SSR/prerendering — see docs/ARCHITECTURE.md "SEO / metadata"). This
 * hook only takes effect after React mounts and runs its effects, so it
 * helps the browser tab and any JS-executing crawler (e.g. Googlebot), but
 * link-preview bots that fetch raw HTML without running JS (WhatsApp,
 * Facebook, X, ...) only ever see `index.html`'s static defaults, never
 * these per-page values. True per-product previews for those would need
 * prerendering/SSR — deliberately not built for a catalogue this size, see
 * docs/ROADMAP.md.
 */
export function useDocumentHead({ title, description, url, image }: DocumentHeadInput) {
  useEffect(() => {
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);

    if (url) upsertMeta('property', 'og:url', url);
    else removeMeta('property', 'og:url');

    if (image) upsertMeta('property', 'og:image', image);
    else removeMeta('property', 'og:image');
  }, [title, description, url, image]);
}
