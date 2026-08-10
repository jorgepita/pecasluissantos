# Architecture

This document describes the system **as implemented** at the end of the
foundation phase. It does not describe planned features — see
[ROADMAP.md](ROADMAP.md) for those.

## Overview

A single-page React application talking directly to Supabase (PostgreSQL +
Auth + Storage) from the browser. There is no custom backend server: all
data access is mediated by Supabase's public APIs and protected by Row
Level Security (RLS) policies in Postgres. This keeps the app deployable
as static files (compatible with free/low-cost static hosting such as
GitHub Pages) while keeping data access secure.

```
Browser (React SPA)
   │  supabase-js client (anon key only)
   ▼
Supabase
   ├─ PostgreSQL (RLS-protected tables)
   ├─ Auth (email/password, admin allowlist)
   └─ Storage (product-images bucket, RLS-protected)
```

No backend server is planned unless a genuine need emerges (e.g. a
requirement Supabase can't express via RLS/Postgres functions/Storage
policies). Introducing one would be an architectural change and should be
discussed before being made.

## Frontend architecture

- **React 19 + Vite + TypeScript**, built as a static SPA.
- **Routing**: `react-router-dom`, with the route tree in
  `src/app/routes.tsx` split into two layout subtrees:
  - `PublicLayout` (`src/layouts/PublicLayout.tsx`) — storefront chrome
    (header/footer), wraps all public routes.
  - `AdminLayout` (`src/layouts/AdminLayout.tsx`) — admin chrome, wraps all
    `/admin/*` routes and sits behind `RequireAuth`.

  This split is the enforcement point for principle "keep public and
  administrative functionality clearly separated" at the UI layer. The
  real security boundary is RLS (see below), not this split — the split
  exists for UX and code organization, not as a security control.

- **Design system foundation**: reusable primitives in
  `src/components/ui/` (`Button`, `Input`, `Card`, `Badge`, `Container`).
  Design tokens (colour palette, font stack) are defined once in
  `src/styles/global.css` via Tailwind v4's CSS `@theme` block, so visual
  changes happen in one place. See "Design tokens" below.

- **State/data**: no global state library. Auth session state lives in
  `AuthContext`/`AuthProvider` (`src/features/auth/`), the only
  cross-cutting client state that currently exists. Data fetching is
  plain `async`/`await` calls to the Supabase client (see
  `src/services/storeConfigService.ts` for the pattern) — no data-fetching
  library has been introduced; add one (e.g. TanStack Query) only once
  there's enough real fetching/caching complexity to justify it.

## Public catalogue (Phase 1B)

Routes: `/` (landing — hero + active top-level categories as entry
points), `/produtos` (listing — search + filters), `/produtos/:slug`
(detail). Filters/search live in URL query params
(`?categoria=&marca=&condicao=&q=`), not their own routes — bookmarkable,
and matches the `/produtos/<slug>` shape [DATABASE.md](DATABASE.md)
already documented before this phase existed.

- **`src/features/catalogue/`** holds every catalogue Supabase call
  (`api.ts`), view types not already in `types/database.ts` (`types.ts`),
  a pure flat-list→tree helper (`buildCategoryTree.ts`), three small
  fetch-state hooks (`useCategories`, `useBrands`, `useProductList`,
  `useProductDetail`), and presentation components
  (`components/ProductCard`, `ProductGrid`, `ProductFilters`,
  `CategoryList`, `ProductGallery`, `ConditionBadge`,
  `ProductCardSkeleton`, `CatalogueImage`). This is a `features/` module
  rather than a `services/` file because it has its own components, not
  just queries — same shape as `features/auth/`, per
  [PROJECT_MAP.md](PROJECT_MAP.md)'s own stated rule. `pages/public/*`
  stay thin, composing it.
- **No RLS-redundant filtering.** None of these queries add
  `status = 'available'` / `is_active = true` themselves — RLS already
  guarantees that for the anon role (see [DATABASE.md](DATABASE.md)
  "Public visibility"). Only `is_admin()`-gated writes duplicate a
  server-side check; public reads don't need to.
- **Search** (`listProducts` in `api.ts`): `name ilike` OR
  `primary_reference_normalized ilike` (client-normalized the same way
  the DB's generated column is: uppercase, strip non-alphanumerics) OR
  `id in (...)` for products matched only via
  `product_reference_aliases`. All three combined into one `.or()` call
  so server-side `range()` pagination stays correct; the raw user search
  term is escaped for PostgREST's `.or()` grammar (comma/parenthesis/quote
  quoting) since it's the one value here that isn't already constrained to
  a safe character set. **Known limitation**: `ilike '%term%'` (leading
  wildcard) isn't index-accelerated — acceptable for a small catalogue,
  revisit (e.g. `pg_trgm`) only if it measurably isn't once the catalogue
  has real volume. No full-text/trigram infrastructure was added now —
  out of scope for this phase and Phase 1A's schema is closed.
- **Pagination**: `range()`-based "load more" (fixed page size, results
  appended), not page-number pagination. When a search term is active,
  results are still fetched via the same paginated query — the search
  predicate is just additional `.or()` conditions on the same
  `range()`-scoped request, not a separate unpaginated path.
- **Images**: `supabase.storage.from('product-images').getPublicUrl(path)`
  — synchronous URL construction, no network call, since the bucket is
  public. `CatalogueImage` handles both "no image at all" and "the object
  failed to load" with the same inline fallback (no placeholder-image
  dependency). Primary image = `is_primary`, tie-broken by `sort_order`.
- **Store settings are now live**: `PublicLayout` calls the existing
  `getStoreConfig()` on mount (local `useState`, no new context — only
  this component needs it). Renders name, logo, phone, email, WhatsApp
  (as a `wa.me` contact link — display only, not the future ordering
  workflow from ROADMAP.md Phase 3), address, opening hours, and social
  links, all conditionally.
- **`primary_color`/`secondary_color` remain unwired**, on purpose —
  reaffirming the Phase 0 decision below, not revisiting it. If dynamic
  theming becomes a real requirement, it needs its own design pass, not a
  side effect of building the catalogue UI.

### Bug found and fixed during this phase

`src/lib/env.ts` returned an **empty string** as the fallback for a
missing `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, and
`src/lib/supabase.ts` calls `createClient()` with that value at module
scope (import time). `@supabase/supabase-js` throws synchronously on an
empty URL/key (`"supabaseUrl is required."` /
`"supabaseKey is required."`) — which crashed the entire app before React
even mounted (no error boundary can catch a throw during module
evaluation) whenever the app ran without credentials configured. This
directly contradicted `env.ts`'s own documented intent ("fail loudly in
the console... but don't throw at module scope"). Fixed by falling back
to a syntactically-valid placeholder URL/key instead of an empty string —
`createClient()` no longer throws, and any query issued against the
placeholder simply fails as a network error, which the catalogue hooks
already handle (loading → error state). Verified directly: reproduced the
throw with a standalone Node script calling `createClient('', '')`
against the installed `@supabase/supabase-js`, confirmed the fix stops
it. Present since Phase 0; found via this phase's required
dev-server smoke check, not a regression introduced by Phase 1B or 1A.

## Supabase architecture

- **Client**: `src/lib/supabase.ts` creates a single `supabase-js` client
  using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  (`src/lib/env.ts`). This is the **only** Supabase client in the app —
  don't instantiate another one, especially not with a different key.
- **Anon key only, ever, in client code.** The anon key is meant to be
  public; it is safe to ship because every table it can reach is governed
  by RLS. A `service_role` key or database password must never appear in
  this repository, in a `VITE_`-prefixed variable, or in any client-side
  code — see [DATABASE.md](DATABASE.md) for what RLS policies currently
  exist.
- **Environment variables**: only `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` are required. `.env.example` documents them
  with placeholder values. Real values live in `.env.local` (git-ignored)
  locally, and in whatever secret store the eventual hosting/CI uses —
  not decided yet (see ROADMAP.md).
- **Status**: a Supabase project is provisioned and connected. Both
  foundation migrations have been applied to it and manually verified —
  tables, `is_admin()`, RLS enablement, and all four expected policies
  confirmed present. See [DATABASE.md](DATABASE.md) for the verification
  detail.

## Authentication approach

- **Supabase Auth**, email/password, via `supabase.auth.signInWithPassword`
  (`src/features/auth/AuthProvider.tsx`). This is real authentication
  against Supabase's `auth.users` — not a mock.
- `AuthProvider` exposes the current session via `useAuth()`
  (`src/features/auth/useAuth.ts`).
- `RequireAuth` (`src/features/auth/RequireAuth.tsx`) redirects
  unauthenticated visitors from `/admin` to `/admin/login`. This is a
  **UX convenience, not the security boundary** — it only controls what
  renders in the browser. The actual boundary is:
  - RLS policies on every table, gated by `public.is_admin()`.
  - There is currently no UI to create an admin account. The first (and
    any) admin is added directly in `admin_users` via the Supabase SQL
    editor/dashboard. See [DATABASE.md](DATABASE.md) for the exact
    procedure. This is intentional: it keeps "who can become an admin"
    out of client-reachable code entirely.
- Being authenticated (any Supabase user) and being an **admin**
  (present in `admin_users`) are different things. A signed-in user who
  is not in `admin_users` can authenticate but `is_admin()` still returns
  false, so RLS still blocks writes.

## Storage approach

Product images use Supabase Storage. The bucket and its policies are
built (`supabase/migrations/0009_create_product_images_storage_bucket.sql`,
Phase 1A) — the **upload UI is not** (that's a later phase). Full detail
in [DATABASE.md](DATABASE.md) ("Storage"); summary:

- `product-images` bucket, public (anonymous reads via Storage's
  public-URL path — no auth needed to view a photo).
- `insert`/`update`/`delete` on objects in that bucket require
  `public.is_admin()`, enforced via `storage.objects` RLS — the same
  `is_admin()` used everywhere else, not a parallel check.
- Bucket-level `file_size_limit` (5 MB) and `allowed_mime_types`
  (jpeg/png/webp) as a first line of defense; not a substitute for
  client-side validation once an upload UI exists.
- **Still undesigned**: orphaned-object cleanup (deleting a `product_images`
  row/product doesn't delete the underlying Storage object), and the exact
  file-naming convention beyond "must be unique per product" (enforced at
  the DB level, not by naming discipline). Both are noted, neither is
  blocking for this phase since there's no upload path yet to produce
  orphans.

## Configuration strategy

Store-specific values (name, logo, phone, WhatsApp number, email, address,
opening hours, social links, brand colours) are modeled as data, not
hardcoded:

- `StoreConfig` type: `src/types/store-config.ts`.
- `store_settings` table (single row): `supabase/migrations/`, documented
  in [DATABASE.md](DATABASE.md).
- `getStoreConfig()` / `DEFAULT_STORE_CONFIG`:
  `src/services/storeConfigService.ts` — `getStoreConfig()` is written to
  read the live row and fall back to `DEFAULT_STORE_CONFIG` if none
  exists yet or the request fails.

**Resolved in Phase 1B**: `PublicLayout` now calls `getStoreConfig()` on
mount and renders the live row (falling back to `DEFAULT_STORE_CONFIG`
while loading and if no row exists yet — unchanged behaviour from before,
just actually wired up now). There is still no admin settings screen to
populate a real row from the UI — until one exists (Phase 2), the row is
created/edited via the Supabase SQL editor, same as today.

The repository/package name (`pecasluissantos` /
`pecas-luis-santos`) is a technical identifier, not necessarily the final
public store brand — do not assume they must match.

`store_settings.primary_color` / `secondary_color` are reserved columns
for a _future_ dynamic theming feature (letting an admin recolour the
storefront at runtime). They are not wired into Tailwind/CSS yet — the
current design tokens in `src/styles/global.css` are static. Wiring them
up is intentionally deferred to avoid premature runtime-theming
complexity.

## Deployment strategy

- **Target**: GitHub Pages, chosen for free static hosting compatible with
  a client-only Supabase-backed SPA.
- **Build**: `npm run build` produces a static `dist/` (via `tsc -b && vite
build`).
- `vite.config.ts` currently sets no explicit `base` (defaults to `/`),
  which is correct for local dev, a custom domain, or a GitHub Pages
  _user/org_ site (`<user>.github.io`). If deployed as a GitHub Pages
  _project_ page (`<user>.github.io/<repo>/`) without a custom domain,
  `base` must be set to `/<repo-name>/` — not done yet since no live
  deployment target has been decided.
- **Not yet implemented**: any CI/CD workflow (e.g. GitHub Actions) to
  build and publish `dist/` automatically. This is explicitly out of
  scope for the foundation phase — see ROADMAP.md.
- Client-side routing (`react-router-dom`) requires the host to serve
  `index.html` for unknown paths (a "SPA fallback"). GitHub Pages needs a
  workaround for this (commonly a `404.html` that redirects to
  `index.html`) — not yet set up, noted here so it isn't forgotten when
  deployment is actually wired up.

## Key architectural decisions (log)

- **No custom backend server.** Supabase (Postgres + RLS + Auth +
  Storage) is sufficient for the current and near-term requirements.
  Revisit only if a concrete requirement can't be expressed this way.
- **Tailwind CSS v4** (`@tailwindcss/vite`) over v3: fewer moving parts
  (no separate PostCSS config), CSS-native token definition.
- **oxlint** instead of ESLint: the current Vite scaffold ships oxlint by
  default; it covers the correctness rules needed (React hooks rules,
  fast-refresh safety) with a single fast binary and no plugin
  dependency tree. Revisit if a rule only ESLint provides becomes
  necessary.
- **No test runner added yet.** There is no meaningful business logic to
  unit test in the foundation phase; validation currently relies on
  `tsc` (type checking), `oxlint`, and manual build/dev-server checks.
  Adding Vitest + React Testing Library is planned for when the first
  real business logic (e.g. product CRUD, availability rules) lands —
  see ROADMAP.md.
- **No global state/data-fetching library.** Not justified yet by the
  amount of shared state or fetching complexity.
- **Catalogue primary keys are `bigint generated always as identity`**,
  not `uuid`, unlike `admin_users.id` (which must match
  `auth.users.id`, a uuid, by definition). Public URLs use `slug`, not
  the numeric id, so sequential IDs don't leak anything sensitive — and
  identity columns avoid an extra extension dependency and keep
  admin-facing listings naturally orderable by creation. Revisit only if
  a concrete reason to obscure catalogue row counts emerges.
- **`condition`/`status` are Postgres enums; `currency` is `text` with a
  format check.** The first two are small, closed, rarely-changing sets —
  a good enum fit. Currency is closer to configuration (a second
  currency is a data change, not new business logic) and enums require a
  migration to extend, so a checked `text` column was chosen instead. See
  [DATABASE.md](DATABASE.md) for the full reasoning.
- **Reference search uses generated, normalized columns**
  (`primary_reference_normalized`, `reference_normalized`), not a
  search-time `lower()`/`replace()` in every query. Computed once at
  write time and indexed, so format differences (spacing, dashes, case)
  between how different people write the same part number don't need
  each query to know to normalize on the fly.
- **No vehicle-compatibility tables yet.** `products.compatibility_notes`
  is a deliberately-named free-text placeholder, not a schema
  commitment. The intended normalized model (Brand → Model →
  Generation/Engine → Year range) is documented in
  [DATABASE.md](DATABASE.md) but not built — building it before there's
  a concrete data source for vehicle data would be speculative.
- **`features/catalogue/` instead of a `services/` file.** Unlike
  `storeConfigService.ts` (one function, no dedicated UI), the catalogue
  has its own hooks and components as well as queries — the shape
  `PROJECT_MAP.md` already assigns to a `features/<name>/` module.
- **Catalogue search combines `.ilike()` and a raw `.or()` string, with
  manual escaping** for the one value that needs it (arbitrary user
  text), rather than reaching for `pg_trgm`/full-text search. Deliberately
  minimal: correct for a small catalogue, and Phase 1A's schema is closed
  for this phase — a real search-performance need would be a reason to
  reopen it later, not a reason to add unused infrastructure now.
- **`src/lib/env.ts` falls back to a placeholder URL/key, not an empty
  string**, when Supabase credentials are missing — fixes a real crash
  (see "Bug found and fixed during this phase" above), keeping the
  module's already-documented "log and don't crash" intent actually true.
