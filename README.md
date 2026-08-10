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
> reference) all exist. The storefront header/footer render live
> `store_settings`. Payments, orders, customer accounts and everything
> else business-specific beyond browsing/contact is **not implemented
> yet** — see [docs/ROADMAP.md](docs/ROADMAP.md).

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

Not yet automated. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
("Deployment strategy") for the intended approach (`npm run build` →
static `dist/` → GitHub Pages) and what's still needed to wire up CI.

## Project structure

See [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) for a full breakdown.
