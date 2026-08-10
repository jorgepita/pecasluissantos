-- Product catalogue core: condition/status enums + the products table.
--
-- Pricing uses `numeric`, never floating point, to avoid rounding error in
-- money math. `currency` is a plain `text` column (checked to look like an
-- ISO 4217 code) rather than an enum, so adding a new currency later is a
-- data change, not a schema migration — deliberately different from
-- `condition`/`status`, which are closed, small sets and use real enums.
--
-- `compatibility_notes` is an explicitly-named escape hatch for free-text
-- human notes (e.g. "fits most 2015-2018 hatchbacks — confirm chassis
-- code"). It is NOT structured vehicle-compatibility data — see
-- docs/DATABASE.md ("Future vehicle compatibility") for the normalized
-- model this is expected to be joined by later, without a products
-- redesign.

create type public.product_condition as enum ('new', 'used', 'refurbished');

create type public.product_status as enum ('draft', 'available', 'reserved', 'sold', 'unavailable');

create table public.products (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null,
  short_description text,
  description text,
  category_id bigint not null references public.categories (id) on delete restrict,
  brand_id bigint references public.brands (id) on delete restrict,
  primary_reference text not null,
  primary_reference_normalized text generated always as
    (upper(regexp_replace(primary_reference, '[^0-9A-Za-z]', '', 'g'))) stored,
  condition public.product_condition not null default 'new',
  price numeric(10, 2) not null,
  currency text not null default 'EUR',
  stock_quantity integer not null default 0,
  status public.product_status not null default 'draft',
  compatibility_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_key unique (slug),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint products_price_non_negative check (price >= 0),
  constraint products_stock_quantity_non_negative check (stock_quantity >= 0),
  constraint products_currency_format check (currency ~ '^[A-Z]{3}$')
);

-- Deliberately not a bare UNIQUE(primary_reference): the same reference
-- string can legitimately appear under different brands (or with no brand
-- set at all), and this stage doesn't assume references are globally
-- unique across the whole catalogue (see docs/DATABASE.md). Scoping
-- uniqueness to (brand_id, primary_reference) catches the realistic
-- mistake — the same brand's reference entered twice — without blocking
-- legitimate cross-brand overlap. Postgres unique indexes treat NULLs as
-- distinct, so multiple no-brand products can still share a reference.
create unique index products_brand_primary_reference_key
  on public.products (brand_id, primary_reference);

create index products_category_id_idx on public.products (category_id);
create index products_brand_id_idx on public.products (brand_id);
create index products_status_idx on public.products (status);
create index products_condition_idx on public.products (condition);
create index products_primary_reference_normalized_idx
  on public.products (primary_reference_normalized);

create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

alter table public.products enable row level security;

-- Public visibility rule: only `available` products are readable by
-- non-admins. draft/reserved/sold/unavailable products exist in the
-- database but are not exposed until their status changes — see
-- docs/DATABASE.md ("Public visibility").
create policy "products_select"
  on public.products
  for select
  to anon, authenticated
  using (status = 'available' or public.is_admin());

create policy "products_insert_admin"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());

create policy "products_update_admin"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "products_delete_admin"
  on public.products
  for delete
  to authenticated
  using (public.is_admin());
