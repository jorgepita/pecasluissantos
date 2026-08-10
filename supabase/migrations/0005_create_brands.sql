-- Product brands (manufacturers/marques). No example brands are seeded —
-- see docs/DATABASE.md ("Seed data").

create table public.brands (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_name_key unique (name),
  constraint brands_slug_key unique (slug),
  constraint brands_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index brands_is_active_idx on public.brands (is_active);

create trigger brands_set_updated_at
  before update on public.brands
  for each row
  execute function public.set_updated_at();

alter table public.brands enable row level security;

create policy "brands_select"
  on public.brands
  for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

create policy "brands_insert_admin"
  on public.brands
  for insert
  to authenticated
  with check (public.is_admin());

create policy "brands_update_admin"
  on public.brands
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "brands_delete_admin"
  on public.brands
  for delete
  to authenticated
  using (public.is_admin());
