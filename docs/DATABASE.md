# Database

This document describes the database **as it exists in
`supabase/migrations/`**, plus a documented (not yet migrated) proposal
for the tables the future product catalogue will need.

A Supabase project has been provisioned and connected, and both
foundation migrations have been applied to it. The live database was
manually verified to match what's described below: `admin_users`,
`store_settings`, and `is_admin()` exist, RLS is enabled on both tables,
and all four expected policies are present (`admin_users_select_own`,
`store_settings_select_public`, `store_settings_insert_admin`,
`store_settings_update_admin`). If you're setting up a different/new
Supabase project, apply the migrations in order via the Supabase SQL
editor or CLI, and re-run the same checks.

## Implemented tables

### `admin_users`

Allowlist of Supabase Auth users who are store administrators. Migration:
`supabase/migrations/0001_create_admin_users.sql`.

| column     | type        | notes                                       |
| ---------- | ----------- | ------------------------------------------- |
| id         | uuid, PK    | references `auth.users(id)`, cascade delete |
| created_at | timestamptz | defaults to `now()`                         |

**RLS**: enabled.

- `select`: an authenticated user may read their own row only
  (`id = auth.uid()`).
- No `insert`/`update`/`delete` policy exists for `anon` or
  `authenticated` — only the `service_role` (Supabase dashboard/SQL
  editor, never client code) can modify this table. This is deliberate:
  there is no self-service path to becoming an admin.

**Bootstrapping the first admin**: after the person has signed up /
been invited via Supabase Auth (so a row exists in `auth.users`), run in
the SQL editor:

```sql
insert into public.admin_users (id)
values ('00000000-0000-0000-0000-000000000000'); -- their auth.users.id
```

### `public.is_admin()`

SQL function (`security definer`, `stable`) returning whether
`auth.uid()` is present in `admin_users`. Defined alongside
`admin_users` in the same migration. Used by RLS policies on other
tables (currently `store_settings`) to gate writes to admins — reuse it
rather than duplicating the check.

### `store_settings`

Single-row table holding store-wide configuration, so the app never
hardcodes store-specific values. Migration:
`supabase/migrations/0002_create_store_settings.sql`. Mapped to the
`StoreConfig` type in application code — see
[ARCHITECTURE.md](ARCHITECTURE.md) ("Configuration strategy").

| column          | type           | notes                                          |
| --------------- | -------------- | ---------------------------------------------- |
| id              | smallint, PK   | fixed at `1` via check constraint (single row) |
| store_name      | text, not null |                                                |
| logo_url        | text           | nullable                                       |
| phone           | text           | nullable                                       |
| whatsapp_number | text           | nullable                                       |
| email           | text           | nullable                                       |
| address         | text           | nullable                                       |
| opening_hours   | jsonb          | nullable; shape TBD when the UI needs it       |
| social_media    | jsonb          | nullable; shape TBD when the UI needs it       |
| primary_color   | text           | nullable; reserved for future dynamic theming  |
| secondary_color | text           | nullable; reserved for future dynamic theming  |
| updated_at      | timestamptz    | defaults to `now()`                            |

**RLS**: enabled.

- `select`: public (`anon` and `authenticated`) — the storefront needs
  this to render contact info/branding.
- `insert`/`update`: `authenticated` role, gated by `public.is_admin()`
  in both `using` and `with check`.
- No row exists until an admin creates one (no seed data is included —
  seeding real store details is a content decision, not a schema one).

## Proposed model (documented only — not migrated)

These tables are **not created yet**. They're documented here so the
shape is agreed and reviewable before the catalogue phase builds them,
per "design and document the initial database model" — not "build the
whole schema now."

- **`categories`** — `id` (PK), `name`, `slug` (unique), `parent_id`
  (self-referencing FK, nullable, for subcategories), `created_at`.
  Index on `slug`. RLS: public select, admin write.

- **`brands`** — `id` (PK), `name`, `slug` (unique), `logo_url`,
  `created_at`. Index on `slug`. RLS: public select, admin write.

- **`products`** — `id` (PK), `reference` (unique, the part
  number — likely the natural lookup key alongside `id`), `name`,
  `short_description`, `price`, `status` (enum-like: e.g.
  `available` / `out_of_stock` / `discontinued`), `category_id` (FK →
  `categories`), `brand_id` (FK → `brands`, nullable), `created_at`,
  `updated_at`. Indexes: `reference` (unique), `category_id`,
  `status`, and likely a full-text search index on `name` once search is
  built. RLS: public select of available/visible products, admin write
  (and likely admin-only select of non-public statuses, e.g.
  discontinued — TBD when that requirement is concrete).

- **`product_images`** — `id` (PK), `product_id` (FK → `products`,
  cascade delete), `storage_path` (points into the Supabase Storage
  bucket described in ARCHITECTURE.md), `position` (int, for display
  order), `created_at`. Index on `product_id`. RLS: public select
  (joined to a visible product), admin write. Deleting the DB row does
  not delete the Storage object automatically — orphan cleanup strategy
  is still to be designed (see ARCHITECTURE.md "Storage approach").

- **`vehicle_compatibility`** — likely a join table, e.g.
  `product_id` (FK → `products`) + a vehicle descriptor (make/model/year
  range, or a FK to a future `vehicle_models` reference table if the
  data warrants normalizing that). Deferred: the exact shape depends on
  how vehicle data is sourced, which isn't decided yet — documenting a
  concrete schema now would be speculative.

None of the above have migrations yet. When they're built, follow the
pattern established by `store_settings`: RLS enabled from the first
migration, public read where the data is meant to be public, writes
gated by `is_admin()`.

## RLS strategy (general)

- RLS is enabled on every table from the migration that creates it —
  never added "later."
- Public-readable data (catalogue-facing) gets an unconditional `select`
  policy for `anon`/`authenticated`.
- All writes require `public.is_admin()` to return true for
  `auth.uid()`. No table relies on the frontend hiding a button as its
  only protection.
- `admin_users` itself is the one exception to "public read" — it has no
  public/anon access at all, and even authenticated users can only see
  their own row.
