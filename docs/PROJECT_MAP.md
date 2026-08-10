# Project Map

Directory structure as it actually exists, and what each part is for.
Deviations from a "textbook" structure are called out with the reasoning.

```
.
├── index.html                  Vite entry HTML (pt-PT lang, app title/meta)
├── vite.config.ts               Vite config: React plugin, Tailwind plugin, "@" path alias
├── tsconfig*.json                TypeScript project config (app + node + root)
├── .env.example                  Documents required env vars (no real secrets)
├── .prettierrc.json / .prettierignore
├── .oxlintrc.json                 Linter config
│
├── src/
│   ├── main.tsx                    App entry point: mounts <App /> and imports global.css
│   ├── vite-env.d.ts                 Typed `import.meta.env` shape
│   │
│   ├── app/
│   │   ├── App.tsx                    Root component: BrowserRouter + AuthProvider + routes
│   │   └── routes.tsx                  Route table: public routes vs. /admin (guarded)
│   │
│   ├── components/ui/               Design-system primitives, framework-agnostic to features
│   │   ├── Button.tsx, Input.tsx, Card.tsx, Badge.tsx, Container.tsx
│   │
│   ├── layouts/                     Page shells composed with react-router's <Outlet />
│   │   ├── PublicLayout.tsx           Header/footer for storefront pages
│   │   └── AdminLayout.tsx             Minimal chrome for admin pages
│   │
│   ├── pages/                        Route-level components — one file per route
│   │   ├── public/HomePage.tsx          Foundation-phase landing/style preview (not the catalogue)
│   │   ├── public/NotFoundPage.tsx
│   │   ├── admin/LoginPage.tsx           Real Supabase Auth sign-in form
│   │   └── admin/DashboardPage.tsx        Placeholder behind RequireAuth
│   │
│   ├── features/auth/                 Auth as a feature module (session context + guard)
│   │   ├── AuthContext.tsx, AuthProvider.tsx, useAuth.ts, RequireAuth.tsx
│   │
│   ├── services/                      Functions that talk to Supabase, one per concern
│   │   └── storeConfigService.ts        Reads store_settings, falls back to defaults
│   │
│   ├── lib/                            Low-level infrastructure, no business logic
│   │   ├── supabase.ts                  The one Supabase client instance
│   │   └── env.ts                        Validated access to VITE_ env vars
│   │
│   ├── types/                          Shared TypeScript types
│   │   ├── database.ts                   Hand-written types mirroring the SQL schema
│   │   │                                   (store/admin + product catalogue tables, enums)
│   │   └── store-config.ts                 App-facing StoreConfig shape
│   │
│   ├── utils/
│   │   └── cn.ts                          Tiny classnames-join helper (no dependency)
│   │
│   └── styles/
│       └── global.css                      Tailwind import + design tokens (@theme) + base styles
│
├── supabase/
│   └── migrations/                    Numbered SQL migrations, applied in order (see DATABASE.md)
│       ├── 0001_create_admin_users.sql
│       ├── 0002_create_store_settings.sql
│       ├── 0003_create_catalogue_helpers.sql       shared set_updated_at() trigger fn
│       ├── 0004_create_categories.sql               hierarchical categories
│       ├── 0005_create_brands.sql
│       ├── 0006_create_products.sql                 condition/status enums + products
│       ├── 0007_create_product_images.sql
│       ├── 0008_create_product_reference_aliases.sql  reference_type enum + aliases
│       └── 0009_create_product_images_storage_bucket.sql  product-images bucket + policies
│
├── public/
│   └── favicon.svg
│
└── docs/
    ├── ARCHITECTURE.md, DATABASE.md, PROJECT_MAP.md (this file), ROADMAP.md
```

## Phase 1A note

The product catalogue database schema (`categories`, `brands`, `products`,
`product_images`, `product_reference_aliases`) and its Supabase Storage
bucket exist as of Phase 1A — see [DATABASE.md](DATABASE.md). There is
deliberately no `src/features/catalogue/`, `src/services/*` catalogue
service, or catalogue page yet: this phase built the data foundation only,
not the UI or the read/write functions that would consume it. Those
arrive with the catalogue-UI phase, following the same shape as
`features/auth/` and `services/storeConfigService.ts`.

## Deviations from the originally sketched structure, and why

- **No top-level `hooks/` directory.** The only hook so far (`useAuth`)
  belongs conceptually to the auth feature, so it lives in
  `features/auth/`. An empty `hooks/` directory would have no purpose
  yet. Add it back if/when a hook emerges that isn't feature-specific
  (e.g. a generic `useDebounce`).
- **`features/` currently has one subfolder (`auth`).** Nothing else is
  built yet that warrants a feature module — the catalogue, cart/reserve
  flow, etc. will each get their own `features/<name>/` when they're
  built, following the same shape as `auth`.
- **No `hooks/`, `utils/` beyond `cn.ts`.** Kept minimal on purpose —
  utilities get added when a second, third use case actually needs them,
  not speculatively.
- **Pages are split `public/` vs `admin/`** (rather than a flat
  `pages/`) to mirror the routing split in `app/routes.tsx` and make the
  public/admin separation visible in the file tree, not just in code.

## Where things go (for future additions)

- A reusable, presentation-only UI piece with no data fetching →
  `components/ui/`.
- A route-level screen → `pages/public/` or `pages/admin/`, wired into
  `app/routes.tsx`.
- A self-contained slice of business functionality (its own state,
  components, and Supabase calls) → a new `features/<name>/` folder,
  following the `features/auth/` shape.
- A function that reads/writes Supabase data → `services/`, one file per
  table or closely related group of tables (see `storeConfigService.ts`).
- A new environment variable → document it in `.env.example` first, then
  add it to `src/lib/env.ts` and `src/vite-env.d.ts`.
