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
│   │   └── buttonStyles.ts             Button's classes, exported separately so a non-<button>
│   │                                    (e.g. a CTA <Link>) can reuse them without breaking
│   │                                    Fast Refresh (a component file must only export components)
│   │
│   ├── layouts/                     Page shells composed with react-router's <Outlet />
│   │   ├── PublicLayout.tsx           Header/footer for storefront pages
│   │   └── AdminLayout.tsx             Minimal chrome for admin pages
│   │
│   ├── pages/                        Route-level components — one file per route
│   │   ├── public/HomePage.tsx          Catalogue landing: hero + active top-level categories
│   │   ├── public/CataloguePage.tsx       @ /produtos — search + filters + product grid
│   │   ├── public/ProductDetailPage.tsx    @ /produtos/:slug
│   │   ├── public/NotFoundPage.tsx
│   │   ├── admin/LoginPage.tsx           Real Supabase Auth sign-in form
│   │   ├── admin/DashboardPage.tsx        Counts + links into each section
│   │   ├── admin/CategoriesPage.tsx, admin/CategoryFormPage.tsx
│   │   ├── admin/BrandsPage.tsx, admin/BrandFormPage.tsx
│   │   ├── admin/ProductsPage.tsx, admin/ProductFormPage.tsx
│   │   └── admin/SettingsPage.tsx
│   │
│   ├── features/auth/                 Auth as a feature module (session context + guard)
│   │   ├── AuthContext.tsx, AuthProvider.tsx, useAuth.ts, RequireAuth.tsx
│   │
│   ├── features/catalogue/            Public catalogue: queries, hooks, catalogue-only components
│   │   ├── api.ts                       Every Supabase call (categories/brands/products/images/aliases)
│   │   ├── types.ts                      View types (ProductListItem, ProductDetail, CategoryNode, ...)
│   │   ├── format.ts                      formatPrice(), referenceTypeLabel()
│   │   ├── buildCategoryTree.ts             Flat rows -> tree (+ flatten for indented <select>)
│   │   ├── useCategories.ts, useBrands.ts    Small fetch-state hooks
│   │   ├── useProductList.ts               Drives /produtos (filters + range()-based "load more")
│   │   ├── useProductDetail.ts
│   │   └── components/
│   │       ├── ProductCard.tsx, ProductGrid.tsx, ProductCardSkeleton.tsx
│   │       ├── ProductFilters.tsx, CategoryList.tsx
│   │       ├── ProductGallery.tsx, ConditionBadge.tsx, CatalogueImage.tsx
│   │       └── ProductContactActions.tsx    WhatsApp/phone contact CTA (Phase 3, no DB write)
│   │
│   ├── features/admin/                Admin CRUD: queries, hooks, admin-only components (Phase 2)
│   │   ├── shared/
│   │   │   ├── pgErrorMessage.ts          Postgres error code -> PT-PT message
│   │   │   ├── slugify.ts, FormField.tsx, ConfirmDialog.tsx, KeyValueListEditor.tsx
│   │   ├── categories/                    api.ts, useAdminCategories.ts, CategoryForm.tsx
│   │   ├── brands/                        same shape as categories/
│   │   ├── products/
│   │   │   ├── api.ts                       Products + product_images + product_reference_aliases CRUD
│   │   │   ├── useAdminProducts.ts, useAdminProduct.ts
│   │   │   └── ProductForm.tsx, ProductImageManager.tsx, ReferenceAliasManager.tsx
│   │   └── settings/
│   │       └── StoreSettingsForm.tsx        Uses storeConfigService's saveStoreConfig()
│   │
│   ├── services/                      Functions that talk to Supabase, one per concern
│   │   └── storeConfigService.ts        Reads/writes store_settings (getStoreConfig, saveStoreConfig)
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
│   │   ├── cn.ts                          Tiny classnames-join helper (no dependency)
│   │   └── whatsapp.ts                     wa.me/tel: URL builders, shared by PublicLayout and
│   │                                        ProductContactActions (one formatting implementation)
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

## Phase 1B note

The public catalogue UI (`features/catalogue/`, the three `pages/public/`
catalogue routes, and the live-`store_settings` `PublicLayout`) was built
in Phase 1B, on top of the Phase 1A data/storage foundation
([DATABASE.md](DATABASE.md)).

## Phase 2 note

Admin CRUD (`features/admin/`, the `pages/admin/*` management screens)
was built in Phase 2, reusing Phase 1A/1B's schema, RLS, Storage bucket,
and (for reference-type labels and the category tree helper)
`features/catalogue/` code directly rather than duplicating it. Still no
data-fetching library — same plain hooks + `async`/`await` pattern as
`features/catalogue/`, per [ARCHITECTURE.md](ARCHITECTURE.md)'s standing
decision.

## Phase 3 note

The product-page contact CTA (`ProductContactActions.tsx`,
`utils/whatsapp.ts`) was added in Phase 3. No new directory — it lives in
`features/catalogue/` because it's product-detail-page UI, and no new
table/service, because it's a pure link-builder with no Supabase write.
`PublicLayout` now passes its already-fetched `store_settings` down via
`<Outlet context>` rather than `ProductDetailPage` fetching it again — the
first use of Outlet context in this codebase.

## Deviations from the originally sketched structure, and why

- **No top-level `hooks/` directory.** The only hook so far (`useAuth`)
  belongs conceptually to the auth feature, so it lives in
  `features/auth/`. An empty `hooks/` directory would have no purpose
  yet. Add it back if/when a hook emerges that isn't feature-specific
  (e.g. a generic `useDebounce`).
- **`features/` currently has three subfolders (`auth`, `catalogue`,
  `admin`).** Each self-contained slice of business functionality — its
  own state/hooks, components, and Supabase calls — gets its own
  `features/<name>/` when it's built, following that same shape. `admin/`
  is further split by subdomain (`categories/`, `brands/`, `products/`,
  `settings/`) since it's a bigger feature than the other two — a future
  cart/reserve flow would get its own top-level folder, not be bolted
  onto an existing one.
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
