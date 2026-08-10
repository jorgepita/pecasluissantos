-- Alternative/equivalent part-number references for a product (OEM codes,
-- other manufacturers' equivalents, etc). A product's own canonical number
-- lives on products.primary_reference — this table is only for
-- *additional* references, used to widen reference search later.

create type public.product_reference_type as enum ('oem', 'manufacturer', 'equivalent', 'other');

create table public.product_reference_aliases (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  reference text not null,
  reference_normalized text generated always as
    (upper(regexp_replace(reference, '[^0-9A-Za-z]', '', 'g'))) stored,
  reference_type public.product_reference_type not null default 'other',
  created_at timestamptz not null default now(),
  -- Prevents the same normalized reference being added twice for the same
  -- product. Deliberately NOT unique across the whole table — the same
  -- reference can legitimately apply to more than one product (e.g. a
  -- generic equivalent part fits several products) — see docs/DATABASE.md.
  constraint product_reference_aliases_product_reference_key
    unique (product_id, reference_normalized)
);

create index product_reference_aliases_product_id_idx
  on public.product_reference_aliases (product_id);
create index product_reference_aliases_reference_normalized_idx
  on public.product_reference_aliases (reference_normalized);

alter table public.product_reference_aliases enable row level security;

create policy "product_reference_aliases_select"
  on public.product_reference_aliases
  for select
  to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.products p
      where p.id = product_reference_aliases.product_id
        and p.status = 'available'
    )
  );

create policy "product_reference_aliases_insert_admin"
  on public.product_reference_aliases
  for insert
  to authenticated
  with check (public.is_admin());

create policy "product_reference_aliases_update_admin"
  on public.product_reference_aliases
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "product_reference_aliases_delete_admin"
  on public.product_reference_aliases
  for delete
  to authenticated
  using (public.is_admin());
