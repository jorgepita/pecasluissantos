# Roadmap

Planned development phases. This is a sequencing guide, not a commitment
to exact scope within each phase — later phases will get their own
detailed planning when they start.

## Phase 0 — Foundation (complete)

- React/Vite/TypeScript project, Tailwind CSS v4, oxlint + Prettier.
- Application shell with public/admin route separation.
- Design-system primitives (Button, Input, Card, Badge, Container) and
  design tokens.
- Supabase client wiring (env-based, anon key only).
- Real Supabase Auth integration (sign-in, session context, route guard).
- Database foundation: `admin_users` + `is_admin()`, `store_settings`,
  both with RLS from the start.
- Supabase project provisioned, connected, and both migrations applied
  and manually verified against the live database (tables, function, RLS,
  and all four policies confirmed present — see DATABASE.md).
- Documentation: README, CLAUDE.md, ARCHITECTURE.md, DATABASE.md,
  PROJECT_MAP.md, ROADMAP.md.

**Explicitly not done in this phase**: product catalogue, product CRUD,
admin dashboard content, product image upload, WhatsApp integration, AI
image recognition, payments, orders, customer accounts, marketplace
integrations, stock management, CI/CD deployment.

## Phase 1A — Product catalogue data model (complete)

- Migrated `categories`, `brands`, `products`, `product_images`,
  `product_reference_aliases` (see DATABASE.md for the full schema,
  relationships, indexes and RLS).
- `product_condition`, `product_status`, `product_reference_type` enums.
- Reference normalization (generated, indexed columns) for
  format-insensitive part-number search.
- Supabase Storage bucket (`product-images`) + RLS policies for
  admin-only writes / public reads.
- `src/types/database.ts` extended with the catalogue schema (hand-written,
  no codegen toolchain introduced).
- No catalogue UI, admin CRUD, or seed data — data/storage foundation
  only, per phase scope.

## Phase 1B — Public catalogue UI (read-only) (complete)

- `/produtos` listing: search (name, primary reference, and alternative
  references via `product_reference_aliases`), filters (category, brand,
  condition), `range()`-based "load more" pagination.
- `/produtos/:slug` product detail: images (from the `product-images`
  bucket, with a primary-image/gallery concept), reference aliases,
  category/brand, price, condition.
- `/` rewritten from the foundation-phase design preview into a real
  landing page (hero + active top-level categories as entry points).
- `PublicLayout` wired to live `store_settings` via `getStoreConfig()`
  (name, logo, phone, email, WhatsApp contact link, address, opening
  hours, social links) — `DEFAULT_STORE_CONFIG` is now only the loading/
  missing-row fallback, not what's always rendered.
- `src/features/catalogue/` (queries, hooks, components) — no
  `src/types/database.ts` changes needed (existing row types covered it).
- Bug found and fixed: `src/lib/env.ts` was returning an empty-string
  fallback for missing Supabase env vars, which crashed the whole app at
  import time (`createClient()` throws on an empty URL/key) — see
  ARCHITECTURE.md.
- **Not done** (still deferred, on purpose): `primary_color`/
  `secondary_color` dynamic theming (Phase 0's standing deferral, not
  revisited), Vitest/RTL (still no business logic complex enough to
  justify it over manual + type-checked verification — reconsider once
  Phase 2's admin forms add real validation logic), full-text/trigram
  search (current `ilike`-based search is adequate for a small
  catalogue).

## Phase 2 — Admin CRUD (complete)

- Category management: list, create/edit, activate/deactivate, parent
  picker with cycle-safe options, slug generation + validation.
- Brand management: same shape as categories, no hierarchy.
- Product management: list/search/filter, create/edit, delete (with
  confirmation), status/condition/category/brand/price/currency/stock/
  primary reference/description fields.
- Multi-image upload UI on the existing `product-images` Storage bucket:
  upload, preview, delete, set primary, reorder — no new bucket.
- Reference alias management on the product edit page, using the
  existing `product_reference_aliases` model.
- Store settings management screen — `store_settings` is now populated
  from the UI instead of only the SQL editor; `saveStoreConfig()` added
  alongside the existing `getStoreConfig()`.
- Friendly PT-PT validation and Postgres-error messages across every
  admin form.
- Security verified directly against the live project: anonymous
  `INSERT` rejected (categories, brands — `42501` RLS violation) and
  anonymous Storage upload rejected (`AccessDenied` RLS violation).
  Anonymous `UPDATE`/`DELETE` rejection and authenticated-non-admin /
  authenticated-admin flows were **not** independently verified from the
  session that built this phase — the live tables are still empty (no
  row to target) and no browser/admin credentials are available outside
  a real browser session. See the Phase 2 completion report.
- Bug found and fixed: `src/types/database.ts` used `interface` for row
  types, which silently broke `.insert()`/`.update()` type-checking
  against the whole `Database` type (collapsed to `never`) — `.select()`
  alone never hit the problem, which is why two prior phases of
  read-only queries didn't surface it. See ARCHITECTURE.md.
- **Not done** (deliberately out of scope): admin account creation UI
  (still SQL-editor bootstrapping, unchanged since Phase 0 — see
  DATABASE.md), vehicle compatibility, WhatsApp ordering workflow,
  payments, orders, customer accounts, stock-management workflow beyond
  the existing `stock_quantity` field, statistics/reporting.

## Phase 3 — Customer-facing contact flow (contact CTA complete)

The current product scope for this version is intentionally
`catalogue → product detail → contact` — no cart, checkout, online
payments, customer accounts, or order management. Those may come later,
but as their own phase, not grown out of this one.

- **Done**: "Contactar sobre este artigo" CTA on `/produtos/:slug` —
  WhatsApp (pre-filled with product name + reference + link) as the
  primary action when `store_settings.whatsapp_number` is set, `tel:` as
  the primary action when only `phone` is set, phone as a secondary
  action when both are set, an unobtrusive notice when neither is
  configured. No order, reservation, or stock side effect — see
  [ARCHITECTURE.md](ARCHITECTURE.md) ("Contact flow"). Note this is
  deliberately named a _contact_ action, not a _reservation_ one — an
  earlier version of this roadmap entry said "reservation," which this
  phase's actual scope explicitly ruled out.
- **Not done**: mobile-first polish pass on catalogue + product pages
  beyond what Phase 1B already shipped responsively — still open.

## Phase 4 — Deployment automation (workflow complete; two manual steps pending)

- **Done**: hosting target decided — GitHub Pages project page
  (`https://jorgepita.github.io/pecasluissantos/`), not a custom domain.
  `vite.config.ts`'s `base` now reads `VITE_BASE_PATH` (set only by the
  workflow), defaulting to `/` everywhere else — see
  [ARCHITECTURE.md](ARCHITECTURE.md) ("Deployment strategy").
- **Done**: `.github/workflows/deploy.yml` — lint, format check, build,
  then deploy `dist/` via `actions/upload-pages-artifact` +
  `actions/deploy-pages` on every push to `main`.
- **Done**: SPA fallback — `dist/index.html` copied to `dist/404.html` in
  the workflow (see ARCHITECTURE.md for why a copy, not a redirect,
  suffices here) — plus `public/.nojekyll`.
- **Done**: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` read from GitHub
  Actions repository secrets in the build step — no secret committed.
- **Done**: fixed a latent bug the base-path change surfaced —
  `ProductContactActions`'s WhatsApp share link now uses
  `import.meta.env.BASE_URL` instead of assuming the app is served from
  the domain root.
- **Pending — requires manual action in the GitHub UI (cannot be done
  from a workflow file or by this session)**:
  1. Repository Settings → Pages → Source → "GitHub Actions".
  2. Repository Settings → Secrets and variables → Actions → add
     `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as
     local `.env.local`).

  Until both are done, the workflow will run on push but the Pages
  deployment step (or the app's Supabase connectivity) won't succeed —
  see README.md ("Deployment") for the exact steps.

- **Pending — requires manual action in the Supabase dashboard**: add the
  production URL under Authentication → URL Configuration once the exact
  `github.io` URL is confirmed live (not required for the current
  email/password-only sign-in flow to function, but keeps the project
  correctly configured for any future redirect-based auth flow — see
  ARCHITECTURE.md).
- **Not done**: custom domain (deliberately deferred — see
  ARCHITECTURE.md).

## Phase 5 — Production catalogue readiness (complete)

Presentation/operational polish on the live catalogue — not new business
scope. Product scope stays `catalogue → product detail → contact`; no
cart/orders/payments/customer-accounts/invoices were added.

- **Done — SEO/discoverability**: per-page `<title>`/description/Open
  Graph via `src/hooks/useDocumentHead.ts` (home, catalogue — incl.
  category-aware title, product detail, not-found); `buildProductUrl()`
  consolidated into one implementation (`features/catalogue/format.ts`),
  reused by both the WhatsApp message and `og:url`; static `og:*`
  defaults added to `index.html`; `public/robots.txt`; CI-generated
  `sitemap.xml` (`scripts/generate-sitemap.mjs`, new deploy-workflow
  step). See ARCHITECTURE.md ("SEO / metadata") for the honest limitation
  — no SSR/prerendering, so non-JS link-preview bots (WhatsApp, Facebook,
  X) never see the per-product versions, only `index.html`'s static
  defaults.
- **Done — search/reference usability**: verified (against real
  production data, not assumed) that reference-format normalization
  ("K9K770"/"K9K-770"/"K9K 770") already worked correctly since Phase 1B
  — no code change needed there. Fixed a real gap: `ProductCard` now
  shows which alternative reference matched when a search hits a product
  only via `product_reference_aliases`
  (`matchedAlternativeReference`) — see ARCHITECTURE.md. Full-text/
  trigram search was **not** added — nothing in this phase's testing
  showed the existing `ilike` approach to be insufficient.
- **Done — admin product-management QoL**: fixed a genuine "Estado"
  terminology collision between condition and publication status
  (renamed the condition-meaning instances to "Condição"); added a
  one-click publish/unpublish action to `ProductsPage`
  (`updateProductStatus`); added product duplication as a client-side
  form-prefill (`ProductDuplicateSeed` — no schema change, no risk of
  copying a slug/reference/stock/live-status). See ARCHITECTURE.md
  ("Product-management quality-of-life").
- **Done — real-data verification**: home, catalogue, the three real
  reference-format search variants, category filter, brand filter
  (two real brands — "Renault", assigned to the one published product,
  and "Brembo teste", assigned to none — confirmed the filter both
  includes and correctly excludes), product detail, image, WhatsApp CTA,
  footer, deep link, and GitHub-Pages base-path correctness were all
  verified against real production data (one published product, three
  categories, two brands). **Not verifiable with current real data**
  (not faked for testing): multi-image gallery switching (the one
  product has a single image) and an alternative reference distinct from
  its own primary reference (the one alias in production happens to
  equal the primary reference). Revisit once the catalogue has more real
  listings/photos.
- **Not done** (deliberately, documented rather than built): true
  per-product Open Graph previews for non-JS crawlers (needs
  prerendering/SSR — disproportionate for a catalogue this size, revisit
  only if traffic/volume ever justifies it); full-text/trigram search
  (still no evidence it's needed); any cart/order/payment/customer-account
  functionality; custom domain; any database schema or RLS change (none
  was required by anything in this phase).

## Phase 6 — Catalogue operations & contact experience (audit complete; small QoL fixes shipped)

Full audit of the day-to-day admin/catalogue/contact workflow against real
production data (one published product at the time of this audit — see
"Not verifiable" below), per the phase brief. Product scope unchanged:
`catalogue → product detail → contact`, no cart/orders/payments.

- **Audit finding**: most of what this phase asked for was already built
  in Phase 5 (quick publish/unpublish, duplication, reference-alias
  handling, WhatsApp/phone contact CTA, `matchedAlternativeReference`,
  empty/error-state separation, mobile polish, SEO). Verified each area
  against the current code rather than assuming the Phase 5 report still
  describes it accurately — it does.
- **Done — admin product list (Workstream A1)**: `ProductsPage`'s table
  was missing `condition` and `stock_quantity`, so "which products have
  no stock?" wasn't answerable without opening each product individually.
  Added "Condição" (reusing the existing `ConditionBadge`) and "Stock"
  columns; a `stock_quantity = 0` row now reads "Sem stock" in red instead
  of a bare `0`, so an admin can scan the list for it directly.
- **Done — product-form description hints (Workstream B2)**: "Descrição
  curta"/"Descrição" had no hint text, so it wasn't obvious from the form
  alone that the short description drives the detail page's top summary
  _and_ the `og:description`/meta-description fallback
  (`buildProductMetaDescription`), while the long description is
  secondary body text. Added hint text to both `FormField`s stating this,
  reusing the existing hint-text pattern — no new component.
- **Done — image manager clarity (Workstream C2/C3)**: `ProductImageManager`
  thumbnails now show a small position-number badge (top-left) and, for
  the primary image, a green "Principal" badge (top-right), in addition
  to the existing text label/button below each thumbnail — makes primary
  image and ordering scannable at a glance instead of requiring reading
  the text under each one. No drag-and-drop added (up/down buttons
  unchanged, per the phase's explicit guidance).
- **Verified, not changed** (no defect found, so nothing was touched):
  reference-format-insensitive search (`K9K770`/`K9K-770`/`K9K 770`/case
  variants all matched the one real product identically), name search,
  condition filter, "no results" vs. technical-error-state separation,
  nonexistent-product 404 handling, WhatsApp contact message contents (no
  internal id, correct base-path URL), `store_settings` reuse across
  header/footer/contact CTA, responsive layout at 375/768/1440px on the
  catalogue and product-detail pages (no horizontal overflow), and
  duplication's field-selection logic (slug/reference/status/stock
  correctly excluded).
- **Not done** (documented, not built — no defect or requirement
  justified touching these): vehicle-compatibility schema (still
  `products.compatibility_notes` free text, per the phase's explicit
  boundary), any drag-and-drop image reordering, any database/RLS
  change (none was needed).
- **Real-data verification — public**: home, catalogue, all five
  reference-search format variants, name search, condition filter,
  product detail (image, price, condition, compatibility notes,
  reference alias, contact CTA), 404 for a nonexistent product/search,
  and 375/768/1440px layouts were driven with a real headless-Chromium
  session (Playwright) against the local dev server connected to the
  live Supabase project — see the Phase 6 completion report for the
  exact commands. Console was clean (no errors) on every page tested.
- **Not verifiable this phase**: the admin screens (the three changes
  above, plus login/create/edit/publish/duplicate/settings) were **not**
  driven in a live browser — admin credentials weren't provided for this
  session, by the user's choice. They were verified by `tsc`/build/lint/
  format only. Also unchanged from Phase 5: multi-image gallery
  switching and a genuinely distinct alternative reference (the one real
  product still has a single image and its one alias equals its primary
  reference) — still not testable without more real catalogue data.

## Later / not yet scheduled

Everything explicitly deferred by the original brief, in no particular
order and not yet scoped:

- Stock management
- Customer accounts
- Orders
- Online payments
- Invoices
- Barcode / QR code support
- Marketplace integrations
- Product import/export
- Advanced vehicle compatibility data model
- Statistics/reporting
- AI-assisted product creation from photographs

Each of these gets its own planning pass when it's actually taken up —
this list exists so they aren't forgotten, not as a spec.
