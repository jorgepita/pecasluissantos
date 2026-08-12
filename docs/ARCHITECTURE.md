# Architecture

This document describes the system **as implemented**, through Phase 2
(Admin CRUD). It does not describe planned features — see
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
- **Reference-format normalization verified, not rebuilt, in Phase 5**:
  the search term and the compared columns
  (`primary_reference_normalized`/`reference_normalized`) were already
  normalized identically (strip non-alphanumeric, uppercase) since Phase
  1B — "K9K770"/"K9K-770"/"K9K 770" already collapse to the same match.
  Confirmed against real production data rather than assumed.
- **`matchedAlternativeReference` (Phase 5)**: when a search matches a
  product only via `product_reference_aliases` (an equivalent/OEM code,
  not its own `primary_reference`), `ProductListItem` now carries which
  alias reference matched, and `ProductCard` shows a small "Ref.
  equivalente: …" line — so the customer can tell why that card matched.
  `searchProductIdsByAliasReference` returns a `Map<productId,
matchedReference>` (first match wins if a product has more than one hit
  — informational text, not a ranking signal), threaded through
  `attachListMetadata`/`listProducts`. `null`/absent outside of an active
  alias-driven search, so normal browsing is visually unchanged.
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

## Admin CRUD (Phase 2)

Authenticated management screens for everything the public catalogue
reads: categories, brands, products (incl. images and reference aliases),
and store settings. All under `/admin/*`, behind the existing
`RequireAuth`/`AdminLayout` — no new auth mechanism.

- **`src/features/admin/`**, organized by subdomain (`categories/`,
  `brands/`, `products/`, `settings/`), plus `shared/` for cross-cutting
  admin UI: `pgErrorMessage.ts` (maps common Postgres error codes —
  `23505` unique_violation, `23503` FK-restrict, `42501` RLS-denied — to
  plain PT-PT messages), `slugify.ts`, `FormField.tsx`, `ConfirmDialog.tsx`,
  `KeyValueListEditor.tsx`. `pages/admin/*` stay thin, same split as
  `pages/public/*`.
- **No client-side admin check anywhere.** Every mutation is a plain
  `supabase.from(table).insert/update/delete(...)` call; if the signed-in
  user isn't in `admin_users`, RLS rejects it and the UI just shows the
  resulting error — there is no `if (isAdmin)` gate in front of a mutation
  that isn't also backed by the matching RLS policy.
- **Categories/brands: activate/deactivate for everyday use; permanent
  delete only when safe (Phase 6B).** `on delete restrict` (see
  [DATABASE.md](DATABASE.md)) means an unconditional delete UI for these
  would mostly just surface a confusing FK error once anything references
  them, so `CategoriesPage`/`BrandsPage` count dependents first
  (`getCategoryDeletionBlockers`/`getBrandDeletionBlockers` in each
  feature's `api.ts`: products directly assigned, plus subcategories for
  categories) and only offer the `ConfirmDialog`-gated "Eliminar" action
  when the count is zero — otherwise the click is blocked outright with a
  specific PT-PT reason ("existem N produtos associados", etc.), no
  round-trip to the database needed. That count is a courtesy for a good
  error message, not the safety mechanism: the delete call itself still
  relies on the same `on delete restrict` foreign keys, and a `23503` from
  a race (a dependent row created between the check and the delete) is
  caught and mapped through the existing `pgErrorMessage()` rather than
  shown raw. Deactivating remains the everyday "remove from the public
  catalogue" action — deletion doesn't replace it, it's for permanently
  removing rows that turn out to be unwanted (e.g. test data) once nothing
  references them. Products get an unconditional real delete (cascades
  images/aliases by design), behind the same `ConfirmDialog`.
- **Product images**: reuses the Phase 1A `product-images` bucket and
  `product_images` table — no new bucket, no new table.
  `ProductImageManager` validates type (jpeg/png/webp) and size (5 MB)
  client-side to match the bucket's own config (fast feedback only, the
  bucket policy is the real enforcement), uploads to
  `products/<product_id>/<crypto.randomUUID()>.<ext>` (a random id, not
  the user's filename — nothing to sanitize, no collision risk), and
  reorders via simple up/down buttons swapping `sort_order` (no
  drag-and-drop dependency). Setting a new primary image unsets the old
  one first, strictly sequentially, so the partial unique index
  (`product_images_one_primary_per_product`) never sees two `is_primary =
true` rows for the same product at once.
- **Reference aliases**: reuses `product_reference_aliases` /
  `referenceTypeLabel()` from `features/catalogue` — one model, one label
  mapping, used by both the public detail page and this admin screen.
- **`opening_hours`/`social_media` shape decided**: `Record<string,
string>` (label → text), matching what `PublicLayout.tsx` already
  assumed when rendering them — the admin form and the public renderer
  agree by construction, not by coincidence.
  `primary_color`/`secondary_color` are editable in the form (real
  columns, the task asked to edit the existing fields) but the storefront
  still doesn't apply them anywhere — the Phase 0 dynamic-theming
  deferral isn't being revisited, the form just says so in its hint text.
- **`src/services/storeConfigService.ts` gained `saveStoreConfig()`**
  (upsert) alongside the existing `getStoreConfig()` — same `StoreConfig`
  shape, same table, not a second settings model.

### Bug found and fixed during this phase

Every `.insert()`/`.update()` call written for this phase failed to
type-check against `src/types/database.ts`'s `Database` type — the
argument type collapsed to `never` for every table. Traced to two
concrete gaps in that file, confirmed by reading
`@supabase/postgrest-js`'s own source
(`PostgrestQueryBuilder.ts`, `types/common/common.ts`), not guessed:

1. Row shapes were declared with `interface X {...}`. Postgrest's
   `.insert()`/`.update()` require each row type to structurally satisfy
   `Record<string, unknown>` — a `type X = {...}` alias for an object
   shape satisfies that, a declared `interface` with identical members
   does not (TypeScript only grants object _type_ shapes an implicit
   index signature for this check). `.select()` doesn't hit this code
   path, which is why it worked fine through two prior phases of
   read-only queries.
2. Each table entry was missing `Relationships: []`, and the schema was
   missing `Views`/`Functions` — both required by postgrest-js's
   `GenericTable`/`GenericSchema` constraint types, even for a project
   with no views or database functions exposed to PostgREST.

Fixed by converting every row type in `database.ts` from `interface` to
`type`, and adding `Relationships: []` / `Views: Record<string, never>` /
`Functions: Record<string, never>`. No behavioural change — this is a
compile-time-only fix, confirmed with an isolated `tsc` repro against the
installed postgrest-js source before applying it project-wide, and by the
full admin CRUD build succeeding afterward with zero `as any`/`as never`
casts needed anywhere in the new code.

### Product-management quality-of-life (Phase 5)

- **"Estado" terminology collision, fixed**: the word was used for two
  different concepts across the app — `ProductForm`'s condition field
  ("Estado do artigo": Novo/Usado/Recondicionado) and both
  `ProductsPage`'s status column and the public condition filter's
  `aria-label` ("Filtrar por estado"). Renamed the condition-meaning
  instances to "Condição" (`ProductForm` field label,
  `ProductFilters.tsx`'s `aria-label`/default option) — "Estado"/
  "Publicação" now consistently mean publication status only, everywhere.
- **Quick publish/unpublish**: `updateProductStatus(id, status)`
  (`features/admin/products/api.ts`) is a partial `.update({ status })`,
  not the full-row `updateProduct()` the edit form uses — added
  specifically so `ProductsPage`'s new "Publicar"/"Despublicar" list
  button doesn't need to fetch-then-resubmit every other field just to
  flip visibility. Deliberately limited to the `available ⇄ unavailable`
  toggle; draft/reserved/sold transitions stay a deliberate choice made
  in the full form.
- **Product duplication is a pure client-side prefill, not a database
  operation.** `products.slug` and `(brand_id, primary_reference)` are
  both unique-constrained (see DATABASE.md), so a server-side copy would
  always collide. Instead, "Duplicar" on `ProductsPage` fetches the full
  row (`getAdminProductById`), builds a `ProductDuplicateSeed` (name,
  descriptions, category/brand, condition, price, currency,
  compatibility notes — explicitly **not** slug, primary reference,
  status, or stock quantity), and navigates to `/admin/produtos/novo`
  with it via router `state`. `ProductForm` gained an `initialValues`
  prop (distinct from `product`, which alone still controls edit-vs-
  create mode) read once into its `useState` initializers. Nothing is
  written until the admin actually fills in a new slug/reference and
  saves — no new table, no new RLS, no risk of silently duplicating a
  live listing's visibility or stock.

## Contact flow (Phase 3)

**Product scope for this version, stated explicitly because it shapes
every decision below**: `catalogue → product detail → contact`. No cart,
no checkout, no online payments, no customer accounts, no order
management. This phase adds only the last step — a "request more info"
action on the product detail page — not a reservation or ordering
system. Nothing here writes to the database: no row is created, no stock
is touched, no product status changes as a side effect of a customer
clicking the CTA.

- **`ProductContactActions`** (`src/features/catalogue/components/`):
  renders on `/produtos/:slug`, right under the price. WhatsApp is the
  primary action whenever `store_settings.whatsapp_number` is set
  (pre-filled with a PT-PT message containing the product name,
  `primary_reference`, and a link back to the product page — no internal
  database id, ever). If only `phone` is set, a `tel:` link becomes the
  primary action instead. If both are set, phone becomes a secondary
  "Ligar" action alongside WhatsApp. If neither is configured, a plain
  unobtrusive notice renders — never a dead/broken button.
- **No new database field, table, or RLS policy.** Reuses
  `store_settings.whatsapp_number`/`phone`/`store_name` exactly as they
  already exist (see [DATABASE.md](DATABASE.md)). The CTA only ever
  appears on a product detail page that RLS already decided is publicly
  visible (`status = 'available'`) — an unpublished product's page
  renders `NotFoundPage` before `ProductContactActions` is ever reached,
  so there's no separate "don't show this for draft products" check to
  get wrong.
- **`src/utils/whatsapp.ts`** (`normalizeWhatsAppNumber`,
  `buildWhatsAppUrl`, `buildTelUrl`): one shared implementation for
  turning a phone number as an admin typed it (spaces, `+351`,
  parentheses, hyphens — all just non-digit noise to strip) into a working
  link. `PublicLayout`'s existing footer WhatsApp link was refactored to
  use this too, rather than keeping its own inline version — the same
  formatting problem, solved once. **Known, undocumented-until-now edge
  case**: a leading international `00` prefix (e.g. `00351...`) is not
  stripped, since `wa.me` expects the bare country code. Not handled —
  the admin settings form's own hint text already guides entry as
  `351912345678` (no `00`, no `+`), and the task's explicit formatting
  list didn't include it. Revisit only if it turns out to be a real data
  entry pattern.
- **`PublicLayoutContext`**: `PublicLayout` already fetches
  `store_settings` once per page load for the header/footer; it now also
  hands that same fetched `StoreConfig` to child routes via
  `<Outlet context={{ storeConfig }}>`, read in `ProductDetailPage` with
  `useOutletContext<PublicLayoutContext>()`. This is router-native prop
  passing, not a new state-management dependency — avoids
  `ProductDetailPage` issuing a second, redundant `store_settings`
  request for data the layout already has.
- **Mobile**: a plain `<a target="_blank">` to `wa.me` — mobile browsers
  already hand `wa.me` links to the WhatsApp app when installed (or the
  web fallback otherwise); no extra JS/user-agent detection needed.

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

## Deployment strategy (Phase 4)

- **Target**: GitHub Pages, as a _project_ page —
  `https://jorgepita.github.io/pecasluissantos/` — chosen for free static
  hosting compatible with a client-only Supabase-backed SPA. No backend
  server, no paid hosting.
- **Build**: `npm run build` produces a static `dist/` (via `tsc -b && vite
build`). Deployment is automated: `.github/workflows/deploy.yml` runs on
  every push to `main` — lint, format check, build, then publish `dist/`
  via the official `actions/upload-pages-artifact` /
  `actions/deploy-pages` actions. No custom deploy server, no committed
  `dist/`.
- **`base` path**: `vite.config.ts` reads `base` from the `VITE_BASE_PATH`
  env var, defaulting to `/` when unset. That default is what local dev
  (`npm run dev`), `npm run build` run locally, and a future custom-domain
  deployment all get — unchanged from before this phase. The GitHub
  Actions workflow is the **only** place `VITE_BASE_PATH=/pecasluissantos/`
  is set, since this is a project page, not a user/org page. Nothing else
  in the repo hardcodes that path.
- **React Router**: `src/app/App.tsx` passes
  `import.meta.env.BASE_URL` (Vite's own reflection of the resolved
  `base`, trailing slash trimmed) as `BrowserRouter`'s `basename`. This is
  the one place the path prefix reaches routing — every `<Link to="...">`
  and `navigate()` call in the app stays root-relative and unaware of it.
- **SPA fallback**: GitHub Pages has no server-side rewrite, so a direct
  navigation or refresh on a client-side route (e.g. `/produtos/algum-slug`)
  is a real request that would otherwise 404. The workflow copies the
  built `dist/index.html` to `dist/404.html` after the build step — GitHub
  Pages serves that for any unknown path, the browser runs it exactly like
  `index.html`, and react-router reads the (unchanged) address bar and
  renders the right route client-side. No redirect-with-sessionStorage
  trick needed; this is the smallest fix that works for a `BrowserRouter`
  app.
- **`.nojekyll`**: `public/.nojekyll` (empty file, copied into `dist/` by
  Vite like any other `public/` asset) tells GitHub Pages not to run the
  build output through Jekyll.
- **Environment variables in CI**: `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` are read from GitHub Actions repository secrets
  in the `build` job's `env:` block, the same two variables documented in
  `.env.example` and read by `src/lib/env.ts` — no new environment-variable
  architecture, no secret is ever hardcoded in the workflow or repo.
- **One-time manual GitHub configuration** (not doable from a workflow
  file): repository Settings → Pages → Source must be set to
  "GitHub Actions", and the two secrets above must be added under
  Settings → Secrets and variables → Actions. See README.md
  ("Deployment").
- **A previously-latent bug this phase surfaced**: `ProductContactActions`
  built the WhatsApp share link as `` `${window.location.origin}/produtos/${slug}` ``
  — correct only when the app is served from the domain root. Under the
  GitHub Pages project-page path this would have 404'd. Fixed to use
  `` `${window.location.origin}${import.meta.env.BASE_URL}produtos/${slug}` ``,
  the same `BASE_URL` used for routing.
- **Supabase Auth**: the app only uses `signInWithPassword` (see
  "Authentication approach" below) — no OAuth, no magic link, no
  email-confirmation redirect, so Supabase's Site URL/Redirect URLs
  allowlist isn't in this flow's critical path today. Still, add the
  production URL (`https://jorgepita.github.io/pecasluissantos/`) under
  Supabase Dashboard → Authentication → URL Configuration → Site URL (and
  Redirect URLs) so it's already correct if a redirect-based flow (e.g.
  password reset) is added later — see README.md for the exact value.
- **Storage**: the existing public `product-images` bucket needs no
  change — its public-URL reads and admin-only write policies are keyed
  on `is_admin()`/bucket config, not on the frontend's origin.
- **Custom domain**: deliberately not configured this phase — the free
  `github.io` URL is sufficient for now; revisit as its own small change
  later.

## SEO / metadata (Phase 5)

- **Client-rendered SPA, no SSR/prerendering** — this shapes everything
  below. `src/hooks/useDocumentHead.ts` sets `document.title` and
  `<meta name="description">`/`og:*` tags per page (used by every
  `pages/public/*` route), but only takes effect after React mounts and
  runs its effects.
- **Known, deliberate limitation**: this helps the browser tab and any
  JS-executing crawler (Googlebot renders JS before indexing), but link-
  preview bots that fetch raw HTML without running JS — WhatsApp,
  Facebook, X, and similar — only ever see `index.html`'s **static**
  `<title>`/`og:*` defaults, never a specific product's. True per-product
  previews for those would need prerendering or SSR, which is
  disproportionate for a catalogue this size and is **not built** — see
  ROADMAP.md if this becomes a real requirement later (e.g. once product
  volume/traffic justifies it).
- **`buildProductUrl(slug)`** (`src/features/catalogue/format.ts`) is the
  one implementation of the base-path-correct absolute product URL —
  `` `origin + import.meta.env.BASE_URL + produtos/<slug>` ``. Both the
  WhatsApp contact message (`ProductContactActions`) and `og:url`
  (`ProductDetailPage`) use it now, instead of the inline copy Phase 4
  originally wrote.
- **`robots.txt`** (`public/robots.txt`, static — Vite doesn't template
  `public/` files) disallows `/pecasluissantos/admin/` and points at the
  sitemap. **Caveat, stated plainly rather than glossed over**: per the
  robots.txt spec, crawlers only auto-discover a robots.txt at the host
  root (`https://jorgepita.github.io/robots.txt`), which this repo
  doesn't control (that would be a separate `jorgepita.github.io`
  user/org-page repo). Under the current project-page path
  (`/pecasluissantos/robots.txt`), generic auto-discovery won't find it —
  it's still correct/harmless, becomes exactly right if a custom domain
  is ever added, and is discoverable today via a Google Search Console
  URL-prefix property scoped to this path.
- **`sitemap.xml`** is **not** committed and **not** produced by
  `npm run build` (that command stays identical to before this phase, for
  local dev). It's generated by `scripts/generate-sitemap.mjs` — a small,
  dependency-free Node script (plain `fetch`/`fs`) — as a **new step in
  `.github/workflows/deploy.yml`**, run after `vite build`, querying
  Supabase's REST API directly with the same anon key already in that
  job. RLS still applies (anon), so it only ever lists
  `status = 'available'` products, the same rule the public catalogue
  itself relies on. Includes the homepage, `/produtos`, and every
  available product's detail page; deliberately excludes
  `?categoria=`-filtered URLs (duplicate-content-ish, not canonical
  pages). Degrades gracefully — logs a warning and either skips or falls
  back to a static-only sitemap, never fails the deploy — if any secret
  or the Supabase query is unavailable, since a sitemap is a nice-to-
  have, not a deploy blocker.

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
- **`src/types/database.ts` row types are `type` aliases, not
  `interface`s**, and every table carries `Relationships: []`
  (schema carries `Views`/`Functions: {}`) — required for
  `.insert()`/`.update()` to type-check at all against a hand-written
  Database type. See "Admin CRUD (Phase 2)" above for the full story;
  don't revert this for style reasons.
- **Categories/brands get activate/deactivate always, and permanent
  delete only when dependency-free; products get an unconditional real
  delete.** Different tables, different constraints (`on delete restrict`
  vs. intentional cascade) — the admin UI mirrors that rather than
  offering one uniform "delete" action everywhere. Permanent
  category/brand deletion (Phase 6B) doesn't change the constraint — it
  adds a pre-check + friendly blocking message in front of it.
- **No drag-and-drop library for product image ordering.** Up/down
  buttons swapping `sort_order` cover the need without a new dependency.
- **The product contact CTA is a link-builder, not a data write.**
  Deliberately modeled as "construct a `wa.me`/`tel:` URL from data
  already public on the page," with no new table (a "contact requests"
  table was explicitly out of scope) and no side effect on `products` —
  keeps the future order system free to be designed on its own terms
  instead of growing out of a contact button.
- **`store_settings` fetched once per page load, shared via Outlet
  context** rather than fetched again by `ProductDetailPage`. First use
  of `<Outlet context>` in this codebase — still not a global state
  library, just router-native parent-to-child data passing for data the
  parent layout already had.
- **GitHub Pages `base` comes from a `VITE_BASE_PATH` env var, set only in
  the deploy workflow**, not hardcoded in `vite.config.ts` — keeps a plain
  local `npm run build` producing the same root-relative output it always
  has, and keeps the repo-specific path (`/pecasluissantos/`) in exactly
  one place (the workflow file). `import.meta.env.BASE_URL` (Vite's own
  reflection of that value) is what `BrowserRouter`'s `basename` reads, so
  routing needs no separate configuration.
- **`dist/404.html` = a copy of `dist/index.html`**, not a redirect page,
  as the GitHub Pages SPA fallback. Simpler than the common
  sessionStorage-redirect trick and sufficient for a `BrowserRouter` app:
  GitHub serves it verbatim for any unmatched path, so the address bar
  (and thus what react-router reads) never changes.
