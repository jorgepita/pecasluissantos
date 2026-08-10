-- Product categories (hierarchical).
--
-- Supports nested categories (e.g. "Motor" > "Alternadores") via a
-- self-referencing `parent_id`. No example categories are seeded here —
-- real category data is a content decision for the future admin panel,
-- not a schema one. See docs/DATABASE.md ("Seed data").

create table public.categories (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null,
  description text,
  parent_id bigint references public.categories (id) on delete restrict,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_key unique (slug),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_not_own_parent check (parent_id is distinct from id)
);

create index categories_parent_id_idx on public.categories (parent_id);
create index categories_is_active_idx on public.categories (is_active);

comment on constraint categories_not_own_parent on public.categories is
  'Blocks the direct self-reference case (a category cannot be its own parent). Deeper cycles (A -> B -> A) are blocked by the categories_prevent_cycle trigger below, not by this constraint.';

create trigger categories_set_updated_at
  before update on public.categories
  for each row
  execute function public.set_updated_at();

-- Rejects any parent_id assignment that would create a cycle deeper than
-- direct self-reference (which the check constraint above already blocks).
-- Walks the ancestor chain on insert/update of parent_id; O(depth) per
-- write, which is fine for a category tree of this business's size.
create function public.prevent_category_cycle()
returns trigger
language plpgsql
as $$
declare
  ancestor_id bigint;
begin
  if new.parent_id is null then
    return new;
  end if;

  ancestor_id := new.parent_id;
  while ancestor_id is not null loop
    if ancestor_id = new.id then
      raise exception 'category % cannot be its own ancestor (cycle detected)', new.id;
    end if;
    select parent_id into ancestor_id from public.categories where id = ancestor_id;
  end loop;

  return new;
end;
$$;

create trigger categories_prevent_cycle
  before insert or update of parent_id on public.categories
  for each row
  execute function public.prevent_category_cycle();

alter table public.categories enable row level security;

-- Public catalogue browsing needs the active category tree; admins manage
-- everything, including inactive categories (e.g. while restructuring).
create policy "categories_select"
  on public.categories
  for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

create policy "categories_insert_admin"
  on public.categories
  for insert
  to authenticated
  with check (public.is_admin());

create policy "categories_update_admin"
  on public.categories
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories_delete_admin"
  on public.categories
  for delete
  to authenticated
  using (public.is_admin());
