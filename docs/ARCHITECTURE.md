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
   └─ Storage (planned — see below)
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

## Storage approach (planned, not yet implemented)

Product images will use Supabase Storage. Documented here so the intended
design is agreed before it's built:

- A public bucket for product photos (read-only to anonymous visitors,
  matching the public catalogue's needs).
- Uploads restricted to admins, enforced via a Storage RLS policy calling
  `public.is_admin()`, mirroring the pattern already used for
  `store_settings`.
- Image naming: prefix by product id/reference to avoid collisions and
  make orphan cleanup traceable (exact convention TBD when the `products`
  table is built).
- Orphaned image cleanup (files left behind after a product/image record
  is deleted) needs an explicit strategy — likely a scheduled Supabase
  Edge Function or a delete-time cleanup call — not designed yet.
- File type restriction (images only) and a reasonable size cap (exact
  limit TBD) enforced both client-side (fast feedback) and via Storage
  bucket policy (actual enforcement).

No bucket, policy, or upload code exists yet — this is a design note for
the phase that builds product image upload.

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

**Current limitation**: the UI shell (`PublicLayout`, `HomePage`) renders
`DEFAULT_STORE_CONFIG` directly rather than calling `getStoreConfig()`,
because there's no admin settings screen yet to populate a real row and
no data would exist to fetch. Wiring the shell to live config is a
next-phase task once that screen exists (see ROADMAP.md) — at that point
`getStoreConfig()` already has the right shape and fallback behaviour.

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
