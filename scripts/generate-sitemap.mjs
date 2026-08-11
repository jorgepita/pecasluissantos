// Generates dist/sitemap.xml for the GitHub Pages deployment.
//
// CI-only, by design: this does NOT run as part of `npm run build` (that
// command must keep working identically for local development — see
// docs/ARCHITECTURE.md "Deployment strategy"). It's invoked as a separate
// step in .github/workflows/deploy.yml, after `vite build`, using the same
// VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY secrets already available to
// that job — the anon key, not a privileged one; this only ever sees what
// RLS already lets an anonymous request see (`status = 'available'`
// products), the same rule the public catalogue itself relies on (see
// docs/DATABASE.md "Public visibility"). No new dependency: plain `fetch`
// (Node 22, already used in CI) and `fs`.
//
// Deliberately excludes category-filtered URLs (`?categoria=...`) —
// they're the same content as /produtos, just filtered, and including
// faceted/filtered URLs in a sitemap is a well-known duplicate-content
// anti-pattern. Only canonical pages: home, /produtos, and each available
// product's detail page.

import { writeFile } from 'node:fs/promises';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = (process.env.SITE_URL ?? '').replace(/\/$/, '');
const OUT_PATH = 'dist/sitemap.xml';

function buildXml(urls) {
  const entries = urls.map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function fetchProductSlugs() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=slug&order=slug`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase products query failed: ${response.status} ${response.statusText}`);
  }
  const rows = await response.json();
  return rows.map((row) => row.slug);
}

async function main() {
  if (!SITE_URL) {
    console.warn('[sitemap] SITE_URL not set — skipping sitemap.xml generation.');
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      '[sitemap] VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY not set — writing a sitemap with only the static pages.',
    );
  }

  const staticUrls = [`${SITE_URL}/`, `${SITE_URL}/produtos`];

  let productUrls = [];
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const slugs = await fetchProductSlugs();
      productUrls = slugs.map((slug) => `${SITE_URL}/produtos/${slug}`);
    } catch (err) {
      // A sitemap is a nice-to-have, not a deployment blocker — log and
      // fall back to the static-only sitemap rather than failing the
      // whole Pages deploy over it.
      console.warn(`[sitemap] Could not fetch product slugs: ${err.message}`);
    }
  }

  const xml = buildXml([...staticUrls, ...productUrls]);
  await writeFile(OUT_PATH, xml, 'utf8');
  console.log(`[sitemap] Wrote ${OUT_PATH} with ${staticUrls.length + productUrls.length} URLs.`);
}

await main();
