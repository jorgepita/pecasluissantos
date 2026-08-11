# Peças Luís Santos

A modern, lightweight automotive-parts management platform. **The current
customer flow, by design, is catalogue → product detail → contact**:
browse the public parts catalogue, open a product, and contact the store
about it. There is intentionally no cart, checkout, online payment,
customer account, or order management in this version — see
[docs/ROADMAP.md](docs/ROADMAP.md) for what's deferred and why.

> **Status**: the application shell, Supabase wiring, authentication
> foundation, the product catalogue data model, a **read-only public
> catalogue** (browse, search, filter, product detail — at `/produtos`),
> a full **admin panel** (`/admin`: categories, brands, products, product
> images, reference aliases, store settings), and a **product-page contact
> CTA** (WhatsApp/phone, pre-filled with the product's name and
> reference) all exist, with a **responsive desktop/tablet/mobile UI**.
> The storefront header/footer render live `store_settings`. **GitHub
> Pages deployment is automated** (see "Deployment" below) but requires
> two one-time manual steps before it's live — see ROADMAP.md for status.
> Payments, orders, customer accounts and everything else
> business-specific beyond browsing/contact is **not implemented yet** —
> see [docs/ROADMAP.md](docs/ROADMAP.md).

Full architecture and rationale live in [`docs/`](docs/):

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — frontend/Supabase architecture, auth, storage, deployment
- [docs/DATABASE.md](docs/DATABASE.md) — schema, RLS strategy, proposed future model
- [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) — directory structure and responsibilities
- [docs/ROADMAP.md](docs/ROADMAP.md) — planned development phases

## Technology stack

- [React 19](https://react.dev/) + [Vite 8](https://vite.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) (via `@tailwindcss/vite`)
- [React Router 7](https://reactrouter.com/) for public/admin route separation
- [Supabase](https://supabase.com/) — PostgreSQL, Auth, Storage, Row Level Security
- [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for linting, [Prettier](https://prettier.io/) for formatting
- GitHub Pages for initial free hosting (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # type-check (tsc) and produce a production build in dist/
npm run preview   # preview the production build locally
npm run lint       # run oxlint
npm run format     # format the codebase with Prettier
npm run format:check
```

## Environment configuration

The app needs a Supabase project's **public** URL and anon key.

1. Copy `.env.example` to `.env.local`.
2. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your
   Supabase project's dashboard (Project Settings → API).
3. Restart the dev server if it was already running.

`.env.local` is git-ignored. **Never** commit real credentials, and never
put a `service_role` key or database password in a `VITE_`-prefixed
variable — anything with that prefix is bundled into the public,
client-side JavaScript. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
for the full security model.

If the app runs without these variables set, it still builds and starts —
it logs a console error and every Supabase call fails (the catalogue
pages show their error state) rather than crashing. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Bug found and fixed
during this phase") for why this needed a real fix, not just a comment
saying it should work this way.

## Database

SQL migrations live in [`supabase/migrations/`](supabase/migrations/). A
Supabase project has been provisioned and connected, and all migrations
(`0001`-`0009`) have been applied and verified against it — tables,
enums, indexes, RLS, and Storage bucket/policies all confirmed present
(see project history for the verification detail). If you're pointing
this app at a different Supabase project, apply the migrations yourself,
in order, via the Supabase SQL editor or CLI. See
[docs/DATABASE.md](docs/DATABASE.md) for full schema details and how to
bootstrap the first admin user.

## Deployment

Automated via GitHub Actions (`.github/workflows/deploy.yml`): every push
to `main` lints, format-checks, builds, and publishes `dist/` to GitHub
Pages. Production URL (once the two one-time steps below are done and the
workflow has run successfully):

```
https://jorgepita.github.io/pecasluissantos/
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Deployment strategy")
for the full mechanics (base path, SPA fallback, etc.).

**Two one-time steps only a repository admin can do** (not possible from
a workflow file):

1. **Settings → Pages → Build and deployment → Source**: set to
   **"GitHub Actions"** (not the legacy branch-based option).
2. **Settings → Secrets and variables → Actions → New repository
   secret**: add both, using the same values as local `.env.local`
   (Supabase dashboard → Project Settings → API):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Until both are done, pushes to `main` will run the workflow, but the
Pages deployment (or the deployed app's Supabase connectivity) won't
succeed.

**Local vs. production build**: `npm run build` locally (no
`VITE_BASE_PATH` set) still produces the same root-relative `dist/` it
always has — nothing about local development or a plain local build
changed. Only the CI workflow sets `VITE_BASE_PATH=/pecasluissantos/`, so
the GitHub Pages path prefix lives in exactly one place
(`.github/workflows/deploy.yml`), not in application code.

**Supabase Auth**: the app currently only uses email/password sign-in
(`signInWithPassword`), which doesn't depend on Supabase's Site
URL/Redirect URLs allowlist. Still, once the production URL above is
confirmed live, add it under Supabase Dashboard → Authentication → URL
Configuration → Site URL (and Redirect URLs) so the project is correctly
configured ahead of any future redirect-based auth flow (e.g. password
reset).

## Project structure

See [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) for a full breakdown.
