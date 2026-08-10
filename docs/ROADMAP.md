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

## Phase 1B — Public catalogue UI (read-only)

- Catalogue listing page, filters (category/brand/availability), search
  (by name, primary reference, and alternative reference via
  `product_reference_aliases`).
- Product detail page, including images from the `product-images` bucket.
- Wire `PublicLayout`/`HomePage` to live `store_settings` via
  `getStoreConfig()` instead of `DEFAULT_STORE_CONFIG`.
- First `services/` functions reading the catalogue tables (respecting
  the `status = 'available'` public-visibility rule already enforced by
  RLS — see DATABASE.md).
- Introduce Vitest + React Testing Library once there's real logic
  (filtering, availability display, etc.) worth unit testing.

## Phase 2 — Admin CRUD

- Admin dashboard: product list, create/edit/delete forms.
- Multi-image upload UI on top of the Storage bucket from Phase 1A.
- Category/brand management screens.
- Store settings management screen (finally populates `store_settings`
  from the UI instead of the SQL editor).
- Availability/status management.

## Phase 3 — Customer-facing contact flow

- WhatsApp contact/reservation button on product detail pages, using
  `store_settings.whatsapp_number`.
- Mobile-first polish pass on catalogue + product pages.

## Phase 4 — Deployment automation

- Decide final hosting target (GitHub Pages project page vs. custom
  domain) and set `vite.config.ts`'s `base` accordingly.
- GitHub Actions workflow: build on push to `main`, deploy `dist/`.
- SPA fallback routing for GitHub Pages (404.html redirect or
  equivalent).
- Secrets handling for CI (Supabase URL/anon key as repo/environment
  secrets — still public-safe values, but kept out of the committed
  history regardless).

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
