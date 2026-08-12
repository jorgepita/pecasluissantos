# Database

This document describes the database **as it exists in
`supabase/migrations/`**, plus a documented (not yet migrated) proposal
for the vehicle-compatibility model a future phase will need.

A Supabase project has been provisioned and connected. Migrations
`0001`-`0002` (admin/store foundation, Phase 0) were applied and verified
previously — see git history for that verification. Migrations
`0003`-`0009` (product catalogue foundation, Phase 1A) are new in this
phase; their live-application status is reported in the Phase 1A
completion report, not repeated here to avoid this document going stale.
If you're setting up a new/different Supabase project, apply every
migration in order via the Supabase SQL editor or CLI, then check tables,
enums, indexes, RLS, and policies match this document.

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
`admin_users` in `0001_create_admin_users.sql`. Used by RLS policies on
every other table (`store_settings`, and every catalogue table below) to
gate writes to admins — reuse it rather than duplicating the check.

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

**RLS**: enabled. `select`: public. `insert`/`update`: admin only
(`public.is_admin()`). No row exists until an admin creates one.

---

## Product catalogue (Phase 1A)

Five tables: `categories`, `brands`, `products`, `product_images`,
`product_reference_aliases`. Migrations `0003`-`0009`. This phase builds
the **data model and Supabase Storage foundation only** — no catalogue UI,
no admin CRUD screens, no seed data (see "Seed data" below).

### `public.set_updated_at()`

Shared trigger function (`0003_create_catalogue_helpers.sql`): sets
`NEW.updated_at = now()` before every `UPDATE`. Attached to `categories`,
`brands`, and `products`. Not retroactively attached to `store_settings`
(0002 is an already-applied migration this phase doesn't touch) — that
table still sets `updated_at` from the application. This is a known,
intentional inconsistency until `store_settings` is next touched.

### `categories`

Hierarchical, self-referencing. Migration: `0004_create_categories.sql`.

| column      | type                  | notes                                                       |
| ----------- | --------------------- | ----------------------------------------------------------- |
| id          | bigint, PK            | `generated always as identity`                              |
| name        | text, not null        |                                                             |
| slug        | text, not null        | unique, lowercase-kebab-case (checked, see "Slugs")         |
| description | text                  | nullable                                                    |
| parent_id   | bigint                | references `categories(id)`, `on delete restrict`, nullable |
| sort_order  | integer, not null     | default `0` — display ordering within a parent              |
| is_active   | boolean, not null     | default `true`                                              |
| created_at  | timestamptz, not null | default `now()`                                             |
| updated_at  | timestamptz, not null | default `now()`, kept current by trigger                    |

**Hierarchy integrity**: a `check` constraint blocks a category being its
own direct parent; a `before insert or update of parent_id` trigger
(`prevent_category_cycle`) walks the ancestor chain and rejects deeper
cycles (A → B → A). No fixed depth limit is enforced — not needed for a
parts-store category tree, and adding one later is a one-line change if
it ever becomes necessary.

**Deletion**: `on delete restrict` — a category with subcategories or
products cannot be deleted. The admin UI (`/admin/categorias`, Phase 6B)
surfaces this: it counts dependents before offering a permanent-delete
confirmation, and blocks the action with a specific PT-PT message rather
than letting the delete silently fail against the constraint. That
UI-level check is a courtesy, not the safety mechanism — this `on delete
restrict` constraint is, since a dependent row can in principle be created
between the check and the delete request.

**Indexes**: `parent_id` (tree traversal), `is_active` (filtering the
public tree). `slug` is already unique-indexed via its constraint.

### `brands`

Migration: `0005_create_brands.sql`.

| column     | type                  | notes                               |
| ---------- | --------------------- | ----------------------------------- |
| id         | bigint, PK            | `generated always as identity`      |
| name       | text, not null        | unique                              |
| slug       | text, not null        | unique, lowercase-kebab-case        |
| is_active  | boolean, not null     | default `true`                      |
| created_at | timestamptz, not null | default `now()`                     |
| updated_at | timestamptz, not null | default `now()`, trigger-maintained |

**Index**: `is_active`.

### `products`

Migration: `0006_create_products.sql`. The catalogue's core table.

| column                       | type                    | notes                                                                                  |
| ---------------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| id                           | bigint, PK              | `generated always as identity`                                                         |
| name                         | text, not null          |                                                                                        |
| slug                         | text, not null          | unique, lowercase-kebab-case                                                           |
| short_description            | text                    | nullable                                                                               |
| description                  | text                    | nullable                                                                               |
| category_id                  | bigint, not null        | references `categories(id)`, `on delete restrict`                                      |
| brand_id                     | bigint                  | references `brands(id)`, `on delete restrict`, nullable                                |
| primary_reference            | text, not null          | the store's canonical part number for this listing                                     |
| primary_reference_normalized | text, generated         | stored generated column, see "Reference normalization"                                 |
| condition                    | `product_condition`     | enum: `new` \| `used` \| `refurbished`; default `new`                                  |
| price                        | numeric(10,2), not null | never floating point; `>= 0`                                                           |
| currency                     | text, not null          | default `'EUR'`; checked to look like an ISO 4217 code (`^[A-Z]{3}$`)                  |
| stock_quantity               | integer, not null       | default `0`; `>= 0`                                                                    |
| status                       | `product_status`        | enum: `draft` \| `available` \| `reserved` \| `sold` \| `unavailable`; default `draft` |
| compatibility_notes          | text                    | nullable; free-text only, see "Future vehicle compatibility"                           |
| created_at                   | timestamptz, not null   | default `now()`                                                                        |
| updated_at                   | timestamptz, not null   | default `now()`, trigger-maintained                                                    |

**Why `category_id` is required but `brand_id` isn't**: every product
needs a place in the browsable tree; not every automotive part has a
meaningful brand (generic/unbranded parts exist). Revisit if that stops
being true.

**Why `numeric(10,2)`, not `float`/`double`**: floating point can't
represent most decimal fractions exactly, which is unacceptable for
money. `numeric` is exact and PostgREST returns it as a string (not a
JS `number`) precisely to stop client code from silently reintroducing
float error — see `src/types/database.ts`.

**Why `currency` is `text` + a format check, not an enum**: `condition`
and `status` are closed, small, rarely-changing sets — a real fit for
Postgres enums. Currency is store configuration that could plausibly
grow (a second currency) without being a schema concern; a `text` column
with a light sanity check avoids a migration for that case. Only `EUR` is
used today (see [ARCHITECTURE.md](ARCHITECTURE.md), the business is
Portugal-based).

**Reference uniqueness**: deliberately **not** `unique(primary_reference)`
— see the migration's comment. Uniqueness is scoped to
`(brand_id, primary_reference)` instead: catches the realistic mistake
(the same brand's reference entered twice) without assuming references
are globally unique across the whole catalogue, which section 8 of the
originating spec explicitly warns against assuming. Products with no
brand set are exempt (Postgres treats `NULL` as distinct in unique
indexes), so two no-brand products can share a reference string.

**Indexes**: `category_id`, `brand_id`, `status`, `condition`,
`primary_reference_normalized` — all direct hits for the search
dimensions listed in the originating spec (name, reference, category,
brand, status, condition). A full-text index on `name` is **not** added
yet — there's no search query pattern to optimize for until the search UI
exists; adding one now would be speculative. Revisit in the catalogue-UI
phase.

**Public visibility rule** (see also "Public visibility" below): RLS
`select` only exposes rows where `status = 'available'`, to non-admins.
`draft`/`reserved`/`sold`/`unavailable` products exist in the database
but are invisible to public/anon queries.

### `product_images`

Migration: `0007_create_product_images.sql`. Pointers into Supabase
Storage — **no binary image data in Postgres**.

| column       | type                  | notes                                          |
| ------------ | --------------------- | ---------------------------------------------- |
| id           | bigint, PK            | `generated always as identity`                 |
| product_id   | bigint, not null      | references `products(id)`, `on delete cascade` |
| storage_path | text, not null        | object path in the `product-images` bucket     |
| alt_text     | text                  | nullable                                       |
| sort_order   | integer, not null     | default `0`                                    |
| is_primary   | boolean, not null     | default `false`                                |
| created_at   | timestamptz, not null | default `now()`                                |

**Why `on delete cascade` here (unlike categories/brands)**: an image row
is meaningless without its product — there's no "orphan image row" state
worth preserving. This matches the originating spec's explicit guidance
to use `CASCADE` "only when it is clearly correct."

**One primary image per product**: enforced with a partial unique index
(`product_images_one_primary_per_product`, `unique (product_id) where
is_primary`) rather than application logic — the database rejects a
second `is_primary = true` row for the same product outright.

**Known gap**: deleting a `products` row cascades the `product_images`
_rows_, but does **not** delete the underlying Storage _objects_ — the
files stay in the bucket, orphaned. Orphan cleanup (e.g. a scheduled
Edge Function reconciling Storage against this table) is still
undesigned — flagged in [ARCHITECTURE.md](ARCHITECTURE.md) and not
solved in this phase, consistent with "don't overcomplicate image
processing infrastructure yet."

**Index**: `product_id`.

### `product_reference_aliases`

Migration: `0008_create_product_reference_aliases.sql`. Alternative/
equivalent part numbers for a product — OEM codes, other manufacturers'
equivalents, etc. A product's own canonical number is
`products.primary_reference`; this table is only for _additional_ ones.

| column               | type                     | notes                                                                     |
| -------------------- | ------------------------ | ------------------------------------------------------------------------- |
| id                   | bigint, PK               | `generated always as identity`                                            |
| product_id           | bigint, not null         | references `products(id)`, `on delete cascade`                            |
| reference            | text, not null           | as typed by the admin                                                     |
| reference_normalized | text, generated          | stored generated column, see below                                        |
| reference_type       | `product_reference_type` | enum: `oem` \| `manufacturer` \| `equivalent` \| `other`; default `other` |
| created_at           | timestamptz, not null    | default `now()`                                                           |

**Uniqueness**: `unique (product_id, reference_normalized)` — the same
normalized reference cannot be added twice _for the same product_, but
the same reference **can** appear on multiple different products (a
generic equivalent part legitimately fits more than one listing). This is
the literal rule from the originating spec, not a simplification.

**Index**: `product_id`, and a global (non-unique) index on
`reference_normalized` for cross-product reference search.

---

## Reference normalization

Both `products.primary_reference_normalized` and
`product_reference_aliases.reference_normalized` are **stored generated
columns**:

```sql
upper(regexp_replace(<reference>, '[^0-9A-Za-z]', '', 'g'))
```

i.e. strip everything except letters/digits, then upper-case. `"OEM 123-456 a"`
and `"oem123456A"` both normalize to `"OEM123456A"`. This is what makes
reference search format-insensitive (spaces, dashes, and case
differences between how different admins/suppliers write the same part
number don't create false negatives). Both columns are indexed; neither
is directly writable (Postgres rejects inserting/updating a `generated
always` column) — application code writes `reference`/`primary_reference`
and reads the normalized form back.

## Slugs

`categories.slug`, `brands.slug`, and `products.slug` are each `unique`
and constrained to lowercase-kebab-case
(`^[a-z0-9]+(-[a-z0-9]+)*$`) by a `check` constraint — bad slugs are
rejected at the database, not just the (not-yet-built) admin form.

**Future public URLs** will be slug-based (e.g. `/produtos/<slug>`), not
ID-based. **Slug changes are not handled specially yet**: renaming a
slug is just an `UPDATE`, and nothing currently preserves the old value
or redirects it. Before the admin UI allows editing a published
product's slug, this needs either (a) a `slug_history` table mapping old
slugs to current products, or (b) a policy of "slugs are stable once a
product is published" enforced in the UI. Neither is decided yet — noted
here so it isn't forgotten, not implemented.

## Public visibility

**Rule** (enforced by RLS, not just documented): a row existing in the
database is not the same as it being publicly visible.

- `products`: visible to `anon`/non-admin `authenticated` only when
  `status = 'available'`.
- `product_images` / `product_reference_aliases`: visible to the public
  only if their parent product is (`status = 'available'`), via an
  `exists (select 1 from products ...)` check in each policy.
- `categories` / `brands`: visible to the public only when
  `is_active = true`.
- Any of the above is fully visible to a signed-in admin
  (`public.is_admin()`), regardless of status/`is_active`, for management
  purposes.

No public catalogue query exists yet (this phase doesn't build one), but
the rule above is what such a query will rely on — it doesn't need to
add its own filtering, RLS already enforces it. This directly addresses
the originating spec's concern: "the future public catalogue should not
accidentally expose draft products."

## Future vehicle compatibility (documented only — not migrated)

**Not built this phase.** The intended shape, so `products` isn't
redesigned when it is built:

```
Brand (e.g. "Volkswagen")
  -> Model (e.g. "Golf")
    -> Generation/Variant (e.g. "Mk7", 2012-2020)
      -> Engine (e.g. "1.6 TDI, 105cv, engine code CLHA")
        -> Year range
```

Likely future tables: `vehicle_makes`, `vehicle_models` (FK to make),
`vehicle_generations` (FK to model, with a year range), and possibly
`vehicle_engines` (FK to generation) — normalized rather than one wide
table, because the same generation/engine combination is reused across
many products. A join table (e.g. `product_vehicle_compatibility`,
`product_id` + a FK into whichever level of the hierarchy is precise
enough for that product) links products to compatible configurations,
many-to-many.

`products.compatibility_notes` (free text) is an explicit, named stand-in
for this — **not** structured data, not queryable by make/model/engine,
and not intended to survive as the permanent solution. It exists so
admins have somewhere to write "fits most 2015-2018 hatchbacks, confirm
chassis code" today without the false impression that it's structured
compatibility data.

## Storage

Bucket `product-images` (`0009_create_product_images_storage_bucket.sql`),
created via `insert into storage.buckets (...) on conflict (id) do
nothing` — safe to re-run.

- **Public bucket** (`public = true`): anyone can read an object via
  Storage's public-URL path with no auth. This is intentional — product
  photos are meant to be publicly viewable — and is _only_ about the read
  path; it does not affect write permissions.
- **Bucket-level restrictions**: `file_size_limit = 5242880` (5 MB),
  `allowed_mime_types = ['image/jpeg', 'image/png', 'image/webp']`.
  Whether these columns are honoured depends on the Storage version
  running on the target project — verify after applying (see the Phase
  1A completion report for this project's result).
- **Write access** (`storage.objects` RLS, scoped to
  `bucket_id = 'product-images'`): `insert`/`update`/`delete` require
  `public.is_admin()`. A `select` policy also exists for API-level reads
  (the public-URL path doesn't need it, but direct API access — e.g. a
  future signed download — does).
- **Not built this phase**: the upload UI, image naming convention beyond
  "must be unique per product" (enforced by
  `product_images_product_storage_path_key`), and orphaned-object cleanup
  (see `product_images` above).

## RLS strategy (general)

- RLS is enabled on every table from the migration that creates it —
  never added "later."
- Public-readable data gets a `select` policy scoped to what's actually
  meant to be public (`is_active`/`status` checks, or an `exists` check
  against the parent's status for child tables) — never a bare
  `using (true)` on anything writable, and never on a table where "public"
  should mean "public and only the public parts."
- All writes (`insert`/`update`/`delete`) require `public.is_admin()` to
  return true for `auth.uid()`, checked separately per action rather than
  one broad `for all` policy. No table relies on the frontend hiding a
  button as its only protection.
- `admin_users` remains the one exception to "public read" — no
  public/anon access at all, and even authenticated users can only see
  their own row.

## Data integrity summary

- `not null` on every column that has no meaningful "unset" state
  (`products.name`, `products.category_id`, etc.).
- `unique` on every slug column, on `brands.name`, on the
  `(brand_id, primary_reference)` pair, and on the two "no duplicate
  normalized value for the same parent" cases (images' `(product_id,
storage_path)`, aliases' `(product_id, reference_normalized)`).
- `check` constraints for: slug format, non-negative price/stock, currency
  format, and the category self-parent guard.
- Foreign keys: `restrict` wherever deleting the parent would silently
  orphan catalogue data an admin still needs to see
  (`categories.parent_id`, `products.category_id`, `products.brand_id`);
  `cascade` only where the child row is meaningless without its parent
  (`product_images.product_id`, `product_reference_aliases.product_id`).

## Seed data

No categories, brands, or products are inserted by any migration in this
phase. The example category tree in the originating spec ("Motor >
Alternadores", "Travões > Discos", ...) is illustrative, not seeded — real
catalogue content is the future admin panel's job, not a schema concern.
If development ever needs sample rows, they belong in a separate,
clearly-labelled script outside `supabase/migrations/`, never in a
migration that also runs against production.
